/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
  /**
   * SE down_type = multiple e launch_operation === payable_account => down_net_amount
   * SE down_type = multiple e launch_operation === receivable => down_net_amount
   * SE down_type = unique e launch_operation === payable_account => downs.paid
   * SE down_type = unique e launch_operation === receivable => downs.paid
   */

  let groupedByDate,
    groupedStatus,
    groupedByEntity,
    groupedByCostCenter,
    groupedByPlanAccount,
    groupedByCustomsClearance,
    groupedByProject,
    groupedByCompany,
    balanceColspan = 18,
    launchColspan = 14,
    totalColspan = 12,
    groupedColspan = 19,
    realizedBalance = 0,
    sumRealizedBalance,
    estimatedBalance = 0,
    sumEstimatedBalance,
    reportStatusOpen,
    reportStatusRealized,
    showBalance,
    error

  const method = 'POST'
  const headers = {
    authorization,
    'Content-Type': 'application/json',
  }

  const getRealizedBalance = async (downDate) => {
    try {
      const companyMust = {}

      options.filterFields.must.filter(item => item?.nested?.path === 'company').forEach(item => {
        item?.nested?.query?.bool?.must?.forEach(obj => {
          if (obj?.match) {
            Object.assign(companyMust, { match: { company_id: obj.match['company.common_id'] } })
          } else if (obj?.exists) {
            Object.assign(companyMust, { exists: {
              field: 'company_id',
            }})
          } else if (obj?.bool?.should) {
            Object.assign(companyMust, {
              bool: {
                should: obj?.bool?.should.map(should => ({
                  match: {
                    company_id: should.match['company.common_id'],
                  }
                }))
              }
            })
          }
        })
      })

      const companyMustNot = {}

      options.filterFields.must_not.filter(item => item?.nested?.path === 'company').forEach(item => {
        const should = item?.nested?.query?.bool?.should?.map(obj => {
          if (obj?.bool?.must) {
            return({ match: {
              company_id: obj?.bool?.must?.match['company.common_id']
            }})
          } else if (obj?.exists) {
            return({ exists: {
              field: 'company_id',
            }})
          } else if (obj?.match) {
            return({ match: {
              company_id: obj.match['company.common_id']
            }})
          }

          return obj
        })

        Object.assign(companyMustNot, {
          bool: {
            should
          }
        })
      })

      const query = {
        must: [],
        must_not: []
      }

      if (Object.keys(companyMust).length > 0) query.must.push(companyMust)
      if (Object.keys(companyMustNot).length > 0) query.must_not.push(companyMustNot)
      if (downDate) query.must.push({
        range: {
          date: {
            lt: downDate
          }
        }
      })

      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify({
          query: `
            query GetRealizedBalance($query: JSON!) {
              financialLaunchRealizedBalanceIndex(
                query: $query
              ) {
                payload
                errors {
                  meta {
                    path
                  }
                  messages
                }
              }
            }
          `,
          variables: {
            query: JSON.stringify(query),
          },
        })
      })

      const { data: { financialLaunchRealizedBalanceIndex: { payload } } } = await response.json()

      return options.sum(payload, 'total_received') + (-1 * options.sum(payload, 'total_paid'))
    } catch {
      error = true
      return 0
    }
  }

  const getFinancialLaunchByDueDate = async (dueDate, ids) => {
    const company = options.filterFields.must.filter(item => item?.nested?.path === 'company')
    const entity = options.filterFields.must.filter(item => item?.nested?.path === 'entity')
    const planAccount = options.filterFields.must.filter(item => item?.nested?.path === 'plan_account')
    const costCenter = options.filterFields.must.filter(item => item?.nested?.path === 'cost_center')
    const customsClearance = options.filterFields.must.filter(item => item?.nested?.path === 'customs_clearance')
    const bankAccount = options.filterFields.must.filter(item => item?.nested?.path === 'bank_account')
    const shipmentId = options.filterFields.must.filter(item => (
      item?.match?.shipment_id
        || item?.bool?.should.filter(obj => obj?.match?.shipment_id ).length > 0
    ))

    const query = {
      must: [
        {
          range: {
            due_date: dueDate,
          }
        },
        ...company,
        ...entity,
        ...planAccount,
        ...costCenter,
        ...customsClearance,
        ...bankAccount,
        ...shipmentId,
      ],
      must_not: [
				{
					exists: {
						field: 'deleted_at',
					},
      	},
				{
					exists: {
						field: 'apportionments',
					},
				},
        {
          terms: {
            id: ids,
          },
        }
			]
    }
    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        query: `
          query GetFinancialLauncByDueDate ($query: JSON!) {
            financialLaunchIndex(
              query: $query
              source: [
                "id",
                "user_description",
                "company",
                "launch_amount",
                "entity",
                "plan_account",
                "cost_center",
                "customs_clearance",
                "project",
                "due_date",
                "retention_total_amount",
                "downs",
                "down_net_amount",
                "launch_operation",
                "status",
                "shipment",
              ]
            ) {
              payload
              errors {
                meta {
                  path
                }
                messages
              }
            }
          }
        `,
        variables: {
          query: JSON.stringify(query),
        }
      })
    })
    const { data: { financialLaunchIndex: { payload } } } = await response.json()

    return payload
  }

  const getRealizedBalanceByBankAccount = async (initialDate, hasRealizedBalance) => {
    try {
      const companyMust = {}
      options.filterFields.must.filter(item => item?.nested?.path === 'company').forEach(item => {
        item?.nested?.query?.bool?.must?.forEach(obj => {
          if (obj?.match) {
            Object.assign(companyMust, { match: { company_id: obj.match['company.common_id'] } })
          } else if (obj?.exists) {
            Object.assign(companyMust, { exists: {
              field: 'company_id',
            }})
          } else if (obj?.bool?.should) {
            Object.assign(companyMust, {
              bool: {
                should: obj?.bool?.should.map(should => ({
                  match: {
                    company_id: should.match['company.common_id'],
                  }
                }))
              }
            })
          }
        })
      })

      const companyMustNot = {}

      options.filterFields.must_not.filter(item => item?.nested?.path === 'company').forEach(item => {
        const should = item?.nested?.query?.bool?.should?.map(obj => {
          if (obj?.bool?.must) {
            return({ match: {
              company_id: obj?.bool?.must?.match['company.common_id']
            }})
          } else if (obj?.exists) {
            return({ exists: {
              field: 'company_id',
            }})
          } else if (obj?.match) {
            return({ match: {
              company_id: obj.match['company.common_id']
            }})
          }

          return obj
        })

        Object.assign(companyMustNot, {
          bool: {
            should
          }
        })
      })
      
      const bankAccountMust = {}
      const bankAccountMustNot = {}

      if (hasRealizedBalance) {
        options.filterFields.must.filter(item => item?.nested?.path === 'downs').forEach(item => {
          item?.nested?.query?.bool?.must?.filter(item => item?.nested?.path === 'downs.bank_account')?.forEach(obj => {
            if (obj?.nested?.query?.match) {
              Object.assign(bankAccountMust, { match: { bank_account_id: obj?.nested?.query?.match['downs.bank_account.id'] } })
            } else if (obj?.nested?.query?.exists) {
              Object.assign(bankAccountMust, { exists: {
                field: 'downs.bank_account_id',
              }})
            } else if (obj?.nested?.query?.bool?.should) {
              Object.assign(bankAccountMust, {
                bool: {
                  should: obj?.nested?.query?.bool?.should.map(should => ({
                    match: {
                      bank_account_id: should.match['downs.bank_account.id'],
                    }
                  }))
                }
              })
            }
          })
        })

        options.filterFields.must_not.filter(item => item?.nested?.path === 'downs').forEach(item => {
          const should = item?.nested?.query?.bool?.should?.map(obj => {
            if (obj?.nested?.query?.match) {
              return({ match: {
                bank_account_id: obj?.nested?.query?.match['downs.bank_account.id']
              }})
            } else if (obj?.nested?.query?.exists) {
              return({ exists: {
                field: 'bank_account_id',
              }})
            } else if (obj?.match) {
              return({ match: {
                bank_account_id: obj.match['bank_account.id']
              }})
            }
  
            return obj
          })
  
          Object.assign(bankAccountMustNot, {
            bool: {
              should
            }
          })
        })
      } else {
        options.filterFields.must.filter(item => item?.nested?.path === 'bank_account').forEach(item => {
          item?.nested?.query?.bool?.must?.forEach(obj => {
            if (obj?.match) {
              Object.assign(bankAccountMust, { match: { bank_account_id: obj.match['bank_account.id'] } })
            } else if (obj?.exists) {
              Object.assign(bankAccountMust, { exists: {
                field: 'bank_account_id',
              }})
            } else if (obj?.bool?.should) {
              Object.assign(bankAccountMust, {
                bool: {
                  should: obj?.bool?.should.map(should => ({
                    match: {
                      bank_account_id: should.match['bank_account.id'],
                    }
                  }))
                }
              })
            }
          })
        })

        options.filterFields.must_not.filter(item => item?.nested?.path === 'bank_account').forEach(item => {
          const should = item?.nested?.query?.bool?.should?.map(obj => {
            if (obj?.bool?.must) {
              return({ match: {
                bank_account_id: obj?.bool?.must?.match['bank_account.id']
              }})
            } else if (obj?.exists) {
              return({ exists: {
                field: 'bank_account_id',
              }})
            } else if (obj?.match) {
              return({ match: {
                bank_account_id: obj.match['bank_account.id']
              }})
            }
  
            return obj
          })
  
          Object.assign(bankAccountMustNot, {
            bool: {
              should
            }
          })
        })
      }

      const query = {
        must: [],
        must_not: []
      }

      if (Object.keys(companyMust).length > 0) query.must.push(companyMust)
      if (Object.keys(companyMustNot).length > 0) query.must_not.push(companyMustNot)
      if (Object.keys(bankAccountMust).length > 0) query.must.push(bankAccountMust)
      if (Object.keys(bankAccountMustNot).length > 0) query.must_not.push(bankAccountMustNot)
      if (initialDate) query.must.push({
        range: {
          date: {
            lt: initialDate
          }
        }
      })

      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify({
          query: `
            query GetRealizedBalanceByBankAccount($query: JSON!) {
              financialLaunchRealizedBalanceByBankAccountIndex(
                query: $query
              ) {
                payload
                errors {
                  meta {
                    path
                  }
                  messages
                }
              }
            }
          `,
          variables: {
            query: JSON.stringify(query),
          },
        })
      })

      const { data: { financialLaunchRealizedBalanceByBankAccountIndex: { payload } } } = await response.json()

      return options.sum(payload, 'total_received') + (-1 * options.sum(payload, 'total_paid'))
    } catch (e) {
      error = true
      return 0
    }
  }

  const getInitialBalance = async (initialDate) => {

    const bankAccountMust = options.filterFields?.must?.find(item => item?.nested?.path === 'bank_account')
    const bankAccountMustNot = options.filterFields?.must_not?.find(item => item?.nested?.path === 'bank_account')

    const bankAccountDownsMust = options.filterFields?.must?.find(item => item?.nested?.path === 'downs')?.nested
      ?.query?.bool?.must?.find(item => item?.nested?.path === 'downs.bank_account')

    const bankAccountDownsMustNot = options.filterFields?.must_not?.find(item => item?.nested?.path === 'downs')?.nested
      ?.query?.bool?.should?.find(item => item?.nested?.path === 'downs.bank_account')

    if (bankAccountMust || bankAccountMustNot || bankAccountDownsMust || bankAccountDownsMustNot) {
      realizedBalance = await getRealizedBalanceByBankAccount(initialDate, !!(bankAccountDownsMust || bankAccountDownsMustNot) )
    } else {
      realizedBalance = await getRealizedBalance(initialDate)
    }
  }

  const months = {
    '01': 'Janeiro',
    '02': 'Fevereiro',
    '03': 'Março',
    '04': 'Abril',
    '05': 'Maio',
    '06': 'Junho',
    '07': 'Julho',
    '08': 'Agosto',
    '09': 'Setembro',
    '10': 'Outubro',
    '11': 'Novembro',
    '12': 'Dezembro',
  }

  const {
    financialLaunchIndex: {
      payload,
      errors,
    },
  } = data

  reportStatusRealized = true
  reportStatusOpen = true

  const rangeDownDate = options.filterFields.must
    ?.find(item => item.nested?.path === 'downs')?.nested?.query?.bool?.must
    ?.find(item => item?.range)?.range

  const getAllFinancialLaunch = [
    ...payload.map(item => {
      if (rangeDownDate) {
        const due_date = new Date(item._source.due_date)
        const gte = new Date(rangeDownDate['downs.down_date'].gte)
        const lte = new Date(rangeDownDate['downs.down_date'].lte)
        return ({
          ...item,
          _source: {
            ...item._source,
            launch_amount: due_date >= gte && due_date <= lte ? item._source.launch_amount : null,
          },
        })
      }

      return item
    }),
    ...(rangeDownDate
      ? await getFinancialLaunchByDueDate(rangeDownDate['downs.down_date'], payload.map(item => item._id)) : []),
  ]

  const downsDates = []

  getAllFinancialLaunch.forEach(item => downsDates.push(...item._source.downs.map(obj => obj.down_date)))

  await getInitialBalance(rangeDownDate['downs.down_date']?.gte || downsDates[0])

  showBalance = true

  if (!errors) {
    sumRealizedBalance = realizedBalance
    sumEstimatedBalance = estimatedBalance

    const newPayload = []

    /**
     - O tratamento abaixo é para fazer um sort pela data de vencimento caso o status do filtro seja open;
     - Caso o status seja open, o objeto é montado a partir do lançamento financeiro. Caso contrário, o objeto
       é montado pelo campo down
    */

    getAllFinancialLaunch.sort((a, b) => {
      if (reportStatusOpen) {
        if (a._source.due_date === b._source.due_date) {
          return 0;
        }
        else {
          return (a._source.due_date < b._source.due_date) ? -1 : 1;
        }
      }

      return undefined
    }).forEach(item => {
      if (!['open', 'waiting_review'].includes(item._source.status)) {
        const innerHits = item?.inner_hits?.downs?.hits?.hits
        innerHits?.forEach((downs, index) => {
          const dateSplit = downs._source.down_date?.split('-')
          newPayload.push({
            ...item._source,
            date_grouped: dateSplit ? `${dateSplit[0]}-${dateSplit[1]}` : 'SEM INFORMAÇÃO',
            entity_name: item._source.entity?.social_reason || "SEM INFORMAÇÃO",
            cost_center_name: item._source.cost_center?.name || "SEM INFORMAÇÃO",
            plan_account_name: item._source.plan_account?.name || "SEM INFORMAÇÃO",
            customs_clearance_name: item._source.customs_clearance?.reference || "SEM INFORMAÇÃO",
            project_name: item._source.project?.name || "SEM INFORMAÇÃO",
            company_name: `${item._source.company?.fancy_name || item._source.company?.social_reason} (${item._source.company?.national_identifier.substr(8, 4)})` || "SEM INFORMAÇÃO",
            status_grouped: ['open', 'waiting_review'].includes(item._source.status) ? 'Em aberto' : 'Realizado',
            downs: [downs._source],
            secondGroupingByDate: downs._source.down_date,
            ...downs._source,
            launch_amount: index > 0 ? 0 : item._source.launch_amount,
            bank_account_realized: downs._source.bank_account,
          })
        })
      } else {
        const dateSplit = item._source.due_date?.split('-')
        const downsArray =  item?.inner_hits?.downs?.hits?.hits?.map(downs => downs._source) || item._source.downs

        if (downsArray.length > 0) {
          downsArray.forEach((downItem, index) => {
            newPayload.push({
              ...item._source,
              date_grouped: dateSplit ? `${dateSplit[0]}-${dateSplit[1]}` : 'SEM INFORMAÇÃO',
              secondGroupingByDate: downItem.down_date,
              entity_name: item._source.entity?.social_reason || "SEM INFORMAÇÃO",
              cost_center_name: item._source.cost_center?.name || "SEM INFORMAÇÃO",
              plan_account_name: item._source.plan_account?.name || "SEM INFORMAÇÃO",
              customs_clearance_name: item._source.customs_clearance?.reference || "SEM INFORMAÇÃO",
              project_name: item._source.project?.name || "SEM INFORMAÇÃO",
              company_name: `${item._source.company?.fancy_name || item._source.company?.social_reason} (${item._source.company?.national_identifier.substr(8, 4)})` || "SEM INFORMAÇÃO",
              status_grouped:  ['open', 'waiting_review'].includes(item._source.status) ? 'Em aberto' : 'Realizado',
              downs: [downItem],
              ...downItem,
              launch_amount: index > 0 ? 0 : item._source.launch_amount,
              bank_account_realized: downItem.bank_account,
            })
          })
        } else {
          newPayload.push({
            ...item._source,
            date_grouped: dateSplit ? `${dateSplit[0]}-${dateSplit[1]}` : 'SEM INFORMAÇÃO',
            entity_name: item._source.entity?.social_reason || "SEM INFORMAÇÃO",
            cost_center_name: item._source.cost_center?.name || "SEM INFORMAÇÃO",
            plan_account_name: item._source.plan_account?.name || "SEM INFORMAÇÃO",
            customs_clearance_name: item._source.customs_clearance?.reference || "SEM INFORMAÇÃO",
            project_name: item._source.project?.name || "SEM INFORMAÇÃO",
            company_name: `${item._source.company?.fancy_name || item._source.company?.social_reason} (${item._source.company?.national_identifier.substr(8, 4)})` || "SEM INFORMAÇÃO",
            status_grouped:  ['open', 'waiting_review'].includes(item._source.status) ? 'Em aberto' : 'Realizado',
            downs: downsArray,
            secondGroupingByDate: item._source.due_date,
          })
        }

      }
    })

    const groupedBy = options.groupBy(newPayload, options.groupedBy)

    groupedByDate = options.groupedBy === 'date_grouped' || undefined
    groupedStatus = options.groupedBy === 'status_grouped' || undefined
    groupedByEntity = options.groupedBy === 'entity_name' || undefined
    groupedByCostCenter = options.groupedBy === 'cost_center_name' || undefined
    groupedByPlanAccount = options.groupedBy === 'plan_account_name' || undefined
    groupedByCustomsClearance = options.groupedBy === 'customs_clearance_name' || undefined
    groupedByProject = options.groupedBy === 'project_name' || undefined
    groupedByCompany = options.groupedBy === 'company_name' || undefined

    if (groupedByEntity) {
      launchColspan = launchColspan - 3
      balanceColspan = balanceColspan - 3
      totalColspan = totalColspan - 3
      groupedColspan = groupedColspan - 3
    }

    if (groupedByPlanAccount) {
      launchColspan = launchColspan - 2
      balanceColspan = balanceColspan - 2
      totalColspan = totalColspan - 2
      groupedColspan = groupedColspan - 2
    }

    if (groupedByCostCenter || groupedByCustomsClearance || groupedByProject || groupedByCompany) {
      launchColspan = launchColspan - 1
      balanceColspan = balanceColspan -1
      totalColspan = totalColspan - 1
      groupedColspan = groupedColspan - 1
    }

    const groupedItems = Object.entries(groupedBy).sort(options.alphanumericSort).map(item => {
      let groupedField

      if (groupedByDate) {
        const split = item[0].split('-')
        groupedField = item[0] !== 'SEM INFORMAÇÃO' ? `${months[split[1]]}/${split[0]}` : item[0]
      } else {
        groupedField = item[0]
      }

      const groupedByDateField = Object.entries(options.groupBy(item[1], 'secondGroupingByDate'))
        .sort((a, b) => {
          if (a[0] === b[0]) {
            return 0;
          }
          else {
            return (a[0] < b[0]) ? -1 : 1;
          }
        })
        .map(grouped => {
          const itemsArray = []

          grouped[1].sort((a, b) => {
            if (a.due_date?.toLowerCase() === b.due_date?.toLowerCase()) {
              return 0;
            }
            else {
              return (a.due_date?.toLowerCase() < b.due_date?.toLowerCase()) ? -1 : 1;
            }
          }).forEach(item => {
            const { downs, ...newItem } = item

            if (downs?.length > 0) {
              downs.forEach(downItem => {
                const amount_receivable = newItem.launch_operation === 'receivable_account'
                  ? newItem.launch_amount : null
                const amount_payable = newItem.launch_operation === 'payable_account'
                  ? newItem.launch_amount : null
                // Lógica da query aplicada
                const paid_payable = newItem.launch_operation === 'payable_account'
                  ? downItem.down_type === 'multiple'
                    ? newItem.down_net_amount : downItem.paid
                  : null
                const paid_receivable = newItem.launch_operation === 'receivable_account'
                  ? downItem.down_type === 'multiple'
                    ? newItem.down_net_amount : downItem.paid
                  : null

                const diff = newItem.launch_operation === 'receivable_account'
                  ? amount_receivable - paid_receivable
                  : amount_payable - paid_payable


                sumRealizedBalance = newItem.launch_operation === 'receivable_account'
                  ? sumRealizedBalance + Number(paid_receivable)
                  : sumRealizedBalance - Number(paid_payable)

                const valueForBalance = newItem.launch_operation === 'receivable_account' ? paid_receivable : paid_payable * -1

                itemsArray.push({
                  ...newItem,
                  ...downItem,
                  amount_receivable,
                  amount_payable,
                  paid_payable,
                  paid_receivable,
                  diff,
                  sum_realized_balance: sumRealizedBalance,
                  valueForBalance,
                })
              })
            } else {
              const amount_receivable = newItem.launch_operation === 'receivable_account'
                ? newItem.launch_amount : null
              const amount_payable = newItem.launch_operation === 'payable_account'
                ? newItem.launch_amount : null

              sumRealizedBalance = newItem.launch_operation === 'receivable_account'
                ? sumRealizedBalance + Number(amount_receivable)
                : sumRealizedBalance - Number(amount_payable)

              const valueForBalance = newItem.launch_operation === 'receivable_account' ? amount_receivable : amount_payable * -1

              itemsArray.push({
                  ...newItem,
                  amount_receivable,
                  amount_payable,
                  sum_realized_balance: sumRealizedBalance,
                  valueForBalance,
              })
            }
          })

          return ({
            dateGrouped: grouped[0],
            items: itemsArray,
            subTotalLaunchAmountPayable: options.sum(itemsArray, 'amount_payable'),
            subTotalLaunchAmountReceivable: options.sum(itemsArray, 'amount_receivable'),
            subTotalDownNetAmountPayable: options.sum(itemsArray, 'paid_payable'),
            subTotalDownNetAmountReceivable: options.sum(itemsArray, 'paid_receivable'),
            subTotalDiff: options.sum(itemsArray, 'diff'),
            subTotalRealizedBalance: itemsArray[itemsArray.length - 1]?.sum_realized_balance,
            subTotalValueForBalance: options.sum(itemsArray, 'valueForBalance'),
          })
        })

      return ({
        groupedField,
        groupedByDateField,
        totalGroupedLaunchAmountPayable: options.sum(groupedByDateField, 'subTotalLaunchAmountPayable'),
        totalGroupedLaunchAmountReceivable: options.sum(groupedByDateField, 'subTotalLaunchAmountReceivable'),
        totalGroupedDownNetAmountPayable: options.sum(groupedByDateField, 'subTotalDownNetAmountPayable'),
        totalGroupedDownNetAmountReceivable: options.sum(groupedByDateField, 'subTotalDownNetAmountReceivable'),
        totalGroupedDiff: options.sum(groupedByDateField, 'subTotalDiff'),
        totalGroupedRealizedBalance: groupedByDateField[groupedByDateField.length -1]?.subTotalRealizedBalance,
        totalGroupedValueForBalance: options.sum(groupedByDateField, 'subTotalValueForBalance'),
      })
    })

    const newData = {
      financialLaunchIndex: {
        items: groupedItems,
        totalLaunchAmountPayable: options.sum(groupedItems, 'totalGroupedLaunchAmountPayable'),
        totalLaunchAmountReceivable: options.sum(groupedItems, 'totalGroupedLaunchAmountReceivable'),
        totalDownNetAmountPayable: options.sum(groupedItems, 'totalGroupedDownNetAmountPayable'),
        totalDownNetAmountReceivable: options.sum(groupedItems, 'totalGroupedDownNetAmountReceivable'),
        totalDiff: options.sum(groupedItems, 'totalGroupedDiff'),
        totalValueForBalance: options.sum(groupedItems, 'totalGroupedValueForBalance'),
        totalRealizedBalance: groupedItems[groupedItems.length - 1]?.totalGroupedRealizedBalance || realizedBalance,
        balanceColspan,
        launchColspan,
        totalColspan,
        groupedColspan,
        groupedByCostCenter,
        groupedByPlanAccount,
        groupedByCustomsClearance,
        groupedByProject,
        groupedByCompany,
        groupedByDate,
        groupedByEntity,
        realizedBalance,
        reportStatusOpen,
        reportStatusRealized,
        estimatedBalance,
        sumEstimatedBalance,
        showBalance,
        groupedStatus,
        error,
      }
    }

    return newData
  }

  return {
    financialLaunchIndex: null,
  }
}
