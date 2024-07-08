/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
	let detailedUrl,
	groupedByMovementDate,
	groupedByEntity,
	groupedByCostCenter,
	groupedByPlanAccount,
	isGrouped,
	groupedItems,
	items,
	totalColspan = 3,
	colSpan = 11,
	subTotalColspan = 9,
	lastBalance = 0,
	lastBalanceColspan = 4,
	lastBalanceAdded,
  error

	if (options?.associatedTemplates?.length > 0) {
		const templateId = options.associatedTemplates.find(item => item.key === 'detailedBankAccountMovement')?.template?.value?.toString()

		detailedUrl = options?.reportPermissions?.includes(templateId) ? `/report/${templateId}?query={{query}}` : ''
	}

	const reportType = options?.reportType?.value || undefined

	const method = 'POST'
	const headers = {
		authorization,
		'Content-Type': 'application/json',
	}

	const getLastBalance = async (movementDate) => {
	  try {
      const query = {
        must: [
          {
            range: {
              movement_date: {
                lt: movementDate,
              }
            }
          },
          ...options.filterFields.must.filter(item => !item?.range?.movement_date),
        ],
        must_not: [
          ...options.filterFields.must_not.filter(item => !item?.range?.movement_date),
        ]
      }

      const aggs = {
        groups: {
          nested: { path: "installments" },
          aggs: {
            by_date: {
              terms: {
                field: "installments.movement_date",
                order: { _key: "asc" },
                size: 10000
              },
              aggs: { sum: { sum: { field: "installments.amount" } } }
            }
          }
        }
      }

      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify({
          query: `
            query getLastBalance($query: JSON!, $aggs: JSON!){
              bankAccountMovementIndex(
                query: $query,
                aggs: $aggs,
                source: ["installments.movement_date", "installments.amount", "installments.description", "movement_date", "movement_amount"]
              ) {
                aggregations
                errors {
                  messages
                }
              }
            }
          `,
          variables: {
            query: JSON.stringify(query),
            aggs: JSON.stringify(aggs)
          }
        })
      })
      const { data: { bankAccountMovementIndex: { aggregations } } } = await response.json()

      const arrayAggregation = aggregations.groups.by_date.buckets.map(item => item.sum.value)

      const sum = options.Decimal.sum(...(arrayAggregation.length > 0 ? arrayAggregation : [0]))

      return sum.toNumber()
    } catch {
      error = true
      return 0
    }
	}

  const getDebitItensByValue = async ({
    mustRange,
    mustNotRange,
  }) => {
    const query = {
      must: [
        ...options.filterFields.must.filter(item => !item?.range?.movement_amount),
      ],
      must_not: [
        ...options.filterFields.must_not.filter(item => !item?.range?.movement_amount),
      ]
    }

    if (mustRange) {
      query.must.push({
        range: {
          movement_amount: {
            lte: mustRange?.range?.movement_amount?.gte * -1,
            gte: mustRange?.range?.movement_amount?.lte * -1,
          }
        }
      })
    }
    
    if (mustNotRange) {
      query.must_not.push({
        range: {
          movement_amount: {
            lte: mustNotRange?.range?.movement_amount?.gte * -1,
            gte: mustNotRange?.range?.movement_amount?.lte * -1,
          }
        }
      })
    }

    console.log(query)
  }

	const {
		bankAccountMovementIndex: {
			payload,
			errors,
		},
	} = data

	if (!errors) {
		lastBalance = await getLastBalance(options.filterFields.must.find(item => item?.range?.movement_date)?.range?.movement_date?.gte || payload[0]?._source?.movement_date)

		lastBalanceAdded = lastBalance

    const isCredit = options.filterFields.must.find(item => item?.match?.movement_operation === 'credit')
    const rangeMovementAmountMust = options.filterFields.must.find(item => item?.range?.movement_amount)
    const rangeMovementAmountMustNot = options.filterFields.must_not.find(item => item?.range?.movement_amount)

    if (!isCredit && (rangeMovementAmountMust || rangeMovementAmountMustNot)) {
      await getDebitItensByValue({
        mustRange: rangeMovementAmountMust,
        mustNotRange: rangeMovementAmountMustNot,
      })
    }

		const newPayload = []

    payload.forEach(item => {
      const innerHits = item?.inner_hits?.installments?.hits?.hits

      if (reportType === 'detailed') {
        if (innerHits) {
          innerHits.map(obj => obj._source).forEach(installment => {
            newPayload.push({
              entity_name: installment.entity?.social_reason || "ENTIDADE",
              cost_center_name: item._source.cost_center?.name || "CENTRO DE CUSTO",
              plan_account_name: item._source.plan_account?.name || "PLANO DE CONTAS",
              ...item._source,
              installments: [installment],
              description: installment.description,
              movement_amount: installment.amount,
              payment_mean: installment.payment_mean || item._source.payment_mean,
              entity: installment.entity || item._source.entity,
              customs_clearance: installment.customs_clearance || item._source.customs_clearance,
              project: installment.project || item._source.project,
              shipment: installment.shipment || item._source.shipment,
            })
          })
        } else {
          item._source.installments.forEach(installment => {
            newPayload.push({
              entity_name: installment.entity?.social_reason || "ENTIDADE",
              cost_center_name: item._source.cost_center?.name || "CENTRO DE CUSTO",
              plan_account_name: item._source.plan_account?.name || "PLANO DE CONTAS",
              ...item._source,
              installments: [installment],
              description: installment.description,
              movement_amount: installment.amount,
              payment_mean: installment.payment_mean || item._source.payment_mean,
              entity: installment.entity || item._source.entity,
              customs_clearance: installment.customs_clearance || item._source.customs_clearance,
              project: installment.project || item._source.project,
              shipment: installment.shipment || item._source.shipment,
            })
          })
        }
      } else {
        newPayload.push({
          entity_name: item._source.entity?.social_reason || "ENTIDADE",
          cost_center_name: item._source.cost_center?.name || "CENTRO DE CUSTO",
          plan_account_name: item._source.plan_account?.name || "PLANO DE CONTAS",
          ...item._source
        })
      }
    })

		if (options.groupedBy && reportType === 'detailed') {
			groupedByMovementDate = options.groupedBy === 'movement_date' || undefined
			groupedByEntity = options.groupedBy === 'entity_name' || undefined
			groupedByCostCenter = options.groupedBy === 'cost_center_name' || undefined
			groupedByPlanAccount = options.groupedBy === 'plan_account_name' || undefined
			isGrouped = true

			if (options.groupedBy !== 'movement_date') {
				totalColspan = totalColspan + 5
				colSpan = colSpan -1
				subTotalColspan = subTotalColspan -1
				lastBalanceColspan = lastBalanceColspan + 5
			}
			else {
				totalColspan = totalColspan + 6
				lastBalanceColspan = lastBalanceColspan + 6
			}

			groupedItems = Object.entries(options.groupBy(newPayload, options.groupedBy)).sort(options.alphanumericSort).map(item => {
				let subTotalMovementAmount = 0
				let subTotalLastBalance = lastBalanceAdded
				return ({
					groupFieldName: item[0],
					list: item[1].sort((a, b) => {
            if (a.description === b.description) {
              return 0;
            }
            else {
              return (a.description < b.description) ? -1 : 1;
            }
          }).map(obj => {
						subTotalMovementAmount += Number(obj.movement_amount)
						lastBalanceAdded += Number(obj.movement_amount)
						return {
							...obj,
							url: detailedUrl.replace('{{query}}', btoa(JSON.stringify({
								query: JSON.stringify({ must: [{ match: {id: obj.id } }] }),
							}))),
							lastBalance: lastBalanceAdded,
						}
					}),
					subTotalMovementAmount,
					subTotalLastBalance: subTotalLastBalance + subTotalMovementAmount,
				})
			})
		} else {
			totalColspan = 3
      items = Object.entries(options.groupBy(newPayload, 'movement_date')).map(item => {
        const credit_amount = options.sum(item[1].filter(cred => cred.movement_operation === 'credit'), 'movement_amount')
				const debit_amount = options.sum(item[1].filter(deb => deb.movement_operation === 'debit'), 'movement_amount') * -1
        const diff = credit_amount - debit_amount
        return ({
          movement_date: item[0],
          credit_amount,
          debit_amount,
          diff,
          lastBalance: lastBalanceAdded += diff,
        })
      })
		}

		const newData = {
			bankAccountMovementIndex: {
				items,
				groupedItems,
				groupedByMovementDate,
				groupedByEntity,
				groupedByCostCenter,
				groupedByPlanAccount,
				isGrouped,
				isDetailed: reportType === 'detailed',
				totalDiff: isGrouped ? options.sum(groupedItems, 'subTotalMovementAmount') : options.sum(items, 'diff'),
				totalColspan,
				colSpan,
				subTotalColspan,
				totalLastBalance: lastBalanceAdded,
				lastBalance,
				lastBalanceColspan,
        error,
			}
		}

		return newData
	}

	return {
		bankAccountMovementIndex: null,
	}
}
