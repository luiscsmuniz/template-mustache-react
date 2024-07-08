/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
  let groupedByDueDate,
    groupedByEntity,
    groupedByCostCenter,
    groupedByPlanAccount,
    groupedByCustomsClearance,
    groupedByProject,
    groupedByCompany,
    isGrouped,
    detailedUrl = '',
    groupedItems,
    launchColspan = 16,
    subTotalColspan = 13,
    totalColspan = 14,
    receivableColspan = 9,
    colSpan = 25,
    tdTotalSpan = 8,
    totalFine = 0,
    totalInterest = 0,
    totalDiscount = 0,
    totalPaid = 0,
    totalRetention = 0,
		noPayload

  const types = {
    nfe: 'Nota fiscal',
    tax_coupon: 'Cupom fiscal',
    others: 'Outros',
    darf: 'DARF',
    gps: 'GPS',
    darm: 'DARM',
    grf: 'GRF',
    gare: 'GARE',
    dare: 'DARE',
    billet: 'Boleto',
    cte: 'CTE',
    service_invoice: 'Nota fiscal de serviço',
    exchange_contract: 'Contrato de câmbio',
    invoice: 'Fatura comercial',
    dae: 'DAE',
    banker_check: 'Cheque',
    contract_bank_loans: 'Contrato de emprétimo bancário',
    internal_control: 'Controle interno',
    di: 'Declaração',
    receipt: 'Recibo',
  }

  const method = 'POST'
  const headers = {
    authorization,
    'Content-Type': 'application/json',
  }

  const mustAgent = options.filterFields.must.filter(item => item?.nested?.path === 'agent')
  const mustNotAgent = options.filterFields.must_not.filter(item => item?.nested?.path === 'agent')
  const mustEntityFilter = options.filterFields.must.filter(item => item?.nested?.path === 'entity')
  const mustNotEntityFilter = options.filterFields.must_not.filter(item => item?.nested?.path === 'entity')

  const getFinancialLaunch = async (ids) => {
    const limit = 500
    const results = []

    if (ids.length === 0) {
      return [{
        launch_amount: 0,
        retention_total_amount: 0,
      }]
    }

    for (let start = 0; start < ids.length; start += limit) {
      const end = start + limit > ids.length ? ids.length : start + limit;

      const matchIds = ids.slice(start, end).map(id => ({
        "match": { "id":id }
      }))

      const variables = {
        query: JSON.stringify({
          must: [{
            "bool": {
              "should": matchIds
            }
          }],
        }),
        source: ['launch_amount', 'retention_total_amount', 'id']
      }

      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify({
          query: `
            query getFinancialLaunch($query: JSON!, $source: [String!]) {
              financialLaunchIndex(query: $query, source: $source) {
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
          variables,
        })
      })

      const { data: { financialLaunchIndex: { payload } } } = await response.json()

      results.push(...payload)
    }

    return results
  }

  const getFinancialLaunchByEntity = async ({ ids, mustAgent, mustNotAgent }) => {
    const must = options.filterFields.must.filter(item => item?.nested?.path !== 'agent')
    const mustNot = options.filterFields.must_not.filter(item => item?.nested?.path !== 'agent')
    const mustEntity = mustAgent?.length > 0 ? mustAgent.map(item => {
      return ({
        nested: {
          ...item.nested,
          path: 'entity',
          query: {
            bool: {
              must: item.nested.query?.bool?.must?.map(obj => {
                if (obj?.match) {
                  // condição igual
                  return ({ match: {
                    'entity.id': obj.match['agent.id']
                  }})
                } else if (obj?.exists) {
                  // condição todos
                  return ({ exists: {
                    field: 'entity.id',
                  }})
                } else if (obj?.bool?.should) {
                  // condição igual múltiplo
                  return ({
                    bool: {
                      should: obj?.bool?.should.map(should => ({
                        match: {
                          'entity.id': should.match['agent.id'],
                        }
                      }))
                    }
                  })
                }

                return item
              })
            }
          }
        }
      })
    }): []

    const mustNotEntity = mustNotAgent?.length > 0 ? mustNotAgent.map(item => {
      return ({
        nested: {
          ...item.nested,
          path: 'entity',
          query: {
            bool: {
              should: item.nested.query?.bool?.should?.map(obj => {
                if (obj?.bool?.must) {
                  // condição diferente
                  return ({ match: {
                    'entity.id': obj?.bool?.must?.match['agent.id']
                  }})
                } else if (obj?.exists) {
                  // condição nenhum
                  return ({ exists: {
                    field: 'entity.id',
                  }})
                } else if (obj?.match) {
                  // condição diferente múltiplo
                  return ({ match: {
                    'entity.id': obj.match['agent.id']
                  }})
                }

                return item
              })
            }
          }
        }
      })
    }): []

    const query = {
      must: [
        ...must,
        ...mustEntity,
      ],
      must_not: [
        ...mustNot,
        ...mustNotEntity,
        ...(ids?.length > 0 ? [{
          terms: {
            id: ids,
          }
        }] : [])
      ]
    }

    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        query: `
          query GetFinancialLaunchEntity ($query: JSON!) {
            financialLaunchIndex(
              query: $query
              source: [
                "id",
                "user_description",
                "due_date",
                "company",
                "entity",
                "documents",
                "plan_account",
                "cost_center",
                "customs_clearance",
                "project",
                "accrual_month",
                "launch_amount",
                "retention_total_amount",
                "downs",
                "diff_paid_estimated",
                "observation",
                "agent",
                "financial_launch_apportionment_origin_id"
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

    return payload.map(item => ({
      ...item,
      _source: {
        ...item._source,
        representative_name: item._source?.entity?.social_reason || 'REPRESENTANTE'
      },
    })) || []
  }

  if (options?.associatedTemplates?.length > 0) {
    const templateId = options.associatedTemplates.find(item => item.key === 'detailedReport')?.template?.value?.toString()

    detailedUrl = options?.reportPermissions?.includes(templateId) ? `/report/${templateId}?query={{query}}` : ''
  }

  let totalDiff = 0;
  let totalLaunchAmount = 0;

  const {
    financialLaunchIndex: {
      payload,
      errors,
    },
	} = data

  if (!errors) {
    const firstRequest = payload.map(item => {
      const downs = item?.inner_hits?.downs?.hits?.hits
        ? item?.inner_hits?.downs?.hits?.hits?.map(obj => obj._source)
        : item._source.downs

      return ({
        ...item,
        _source: {
          ...item._source,
          representative_name: item._source?.agent?.social_reason || 'REPRESENTANTE',
          downs,
        },
      })
    })

    if ((mustAgent?.length > 0 || mustNotAgent?.length > 0) && (!(mustEntityFilter?.length > 0) && !(mustNotEntityFilter?.length > 0))) {
      firstRequest.push(...(await getFinancialLaunchByEntity({
        ids: payload?.map(item => item._source.id),
        mustAgent,
        mustNotAgent,
      }) || []))
    }

    if (firstRequest?.length === 0) {
      noPayload = true
    }

    const newPayload = firstRequest.map(item => ({
      entity_name: item._source.entity?.social_reason || "SEM INFORMAÇÃO",
      cost_center_name: item._source.cost_center?.name || "SEM INFORMAÇÃO",
      plan_account_name: item._source.plan_account?.name || "SEM INFORMAÇÃO",
      customs_clearance_name: item._source.customs_clearance?.reference || "SEM INFORMAÇÃO",
      project_name: item._source.project?.name || "SEM INFORMAÇÃO",
      representative_name: item._source.entity?.social_reason || "SEM INFORMAÇÃO",
      company_name: `${item._source.company?.fancy_name || item._source.company?.social_reason} (${item._source.company?.national_identifier.substr(8, 4)})` || "SEM INFORMAÇÃO",
      ...item._source
    }))

    const multiplePaymentIds = []

    newPayload.forEach(item => {
      const firstDown = item.downs?.find((down, index) => index === 0)
      if (firstDown?.down_type === 'multiple') {
        multiplePaymentIds.push(...firstDown?.financial_launch_ids)
      }
    })

    const multiplePayments = await getFinancialLaunch(multiplePaymentIds.filter((value, index, array)=> {
      return array.indexOf(value) === index;
    }))

    const items = await Promise.all(newPayload.map(async(item) => {
      const documents = item.documents.map(doc => {
        const split = doc.document_date?.split('-')

        return ({
          ...doc,
          document_date: split ? `${split[2]}/${split[1]}/${split[0]}` : '',
          document_number: `${doc?.document_type ? `${types[doc?.document_type]} - ` : ''} ${doc?.document_number || ''}`,
        })
      })

      const firstDown = item.downs?.find((down, index) => index === 0)
      let multiplePaymentCalc = () => {}

      /**(sum downs.campo) * (valor tributavel) / soma valor tributavel de todos lançamentos */
      /** calc valor tributável = launch_amount - retention */

      if (firstDown?.down_type === 'multiple') {
        const multiplePayment = multiplePayments.filter(obj => firstDown?.financial_launch_ids?.includes(obj._source.id)).map(item => item._source)

        const multipleLaunchAmount = options.sum(multiplePayment, 'launch_amount')
        const multipleRetention = options.sum(multiplePayment, 'retention_total_amount')
        const value = multipleLaunchAmount - multipleRetention

        multiplePaymentCalc = (field) => field * ((item.launch_amount - item.retention_total_amount) / value)

        totalFine = totalFine + multiplePaymentCalc(firstDown?.fine)
        totalInterest = totalInterest + multiplePaymentCalc(firstDown?.interest)
        totalDiscount = totalDiscount + multiplePaymentCalc(firstDown?.discount)
        totalPaid = totalPaid + multiplePaymentCalc(firstDown?.paid)
      }

      if (firstDown?.down_type === 'unique') {
        totalFine = totalFine + options.sum(item.downs, 'fine')
        totalInterest = totalInterest + options.sum(item.downs, 'interest')
        totalDiscount = totalDiscount + options.sum(item.downs, 'discount')
        totalPaid = totalPaid + options.sum(item.downs, 'paid')
      }

      return ({
        ...item,
        rowspan: item.downs.length > 1 ? item.downs.length + 1 : 1,
        firstDown: {
          ...(firstDown?.down_type === "unique" ? firstDown : {
            ...firstDown,
            fine: multiplePaymentCalc(firstDown?.fine),
            interest: multiplePaymentCalc(firstDown?.interest),
            discount: multiplePaymentCalc(firstDown?.discount),
            paid: multiplePaymentCalc(firstDown?.paid),
          })
        },
        downs: item.downs.filter((down, index) => index !== 0),
        subTotalPaid: item.downs.length > 1 ? options.sum(item.downs, 'paid') : 0,
        document_number: documents.map(doc => doc.document_number).join(', '),
        document_date: documents.map(doc => doc.document_date).join(', '),
        detailedUrlItem: detailedUrl.replace('{{query}}', btoa(JSON.stringify({
          query: JSON.stringify({ must: [{ match: {id: item?.financial_launch_apportionment_origin_id || item.id } }] }),
        })))
      })
    }))

    if (options.groupedBy) {
      if (['entity_name', 'representative_name'].includes(options.groupedBy)){
        launchColspan = launchColspan - 3
        subTotalColspan = subTotalColspan - 2
        totalColspan = totalColspan - 3
        colSpan = colSpan - 2
      } else if (options.groupedBy === 'plan_account_name') {
        launchColspan = launchColspan - 2
        subTotalColspan = subTotalColspan - 1
        totalColspan = totalColspan - 2
        colSpan = colSpan - 1
      } else {
        launchColspan = launchColspan - 1
        totalColspan = totalColspan - 1
      }

      groupedByDueDate = options.groupedBy === 'due_date' || undefined
      groupedByCompany = options.groupedBy === 'company_name' || undefined
      groupedByEntity = options.groupedBy === 'entity_name' || options.groupedBy === 'representative_name' || undefined
      groupedByCostCenter = options.groupedBy === 'cost_center_name' || undefined
      groupedByPlanAccount = options.groupedBy === 'plan_account_name' || undefined
      groupedByCustomsClearance = options.groupedBy === 'customs_clearance_name' || undefined
      groupedByProject = options.groupedBy === 'project_name' || undefined
      isGrouped = true

      groupedItems = await Promise.all(Object.entries(options.groupBy(newPayload, options.groupedBy)).sort(options.alphanumericSort).map(async (item) => {
        let subTotalPaid = 0
        let subTotalDiscount = 0
        let subTotalFine = 0
        let subTotalInterest = 0
        const list = await Promise.all(item[1].map(async (element) => {
          const documents = element.documents.map(doc => {
            const split = doc.document_date?.split('-')
            return ({
              ...doc,
              document_date: split ? `${split[2]}/${split[1]}/${split[0]}` : '',
              document_number: `${doc?.document_type ? `${types[doc?.document_type]} - ` : ''} ${doc?.document_number || ''}`,
            })
          })

          const firstDown = element.downs?.find((down, index) => index === 0)
          let multiplePaymentCalc = () => {}
          /**(sum downs.campo) * (valor tributavel) / soma valor tributavel de todos lançamentos */
          /** calc valor tributável = launch_amount - retention */

          if (firstDown?.down_type === 'multiple') {
            const multiplePayment = multiplePayments.filter(obj => firstDown?.financial_launch_ids?.includes(obj._source.id)).map(item => item._source)
            const multipleLaunchAmount = options.sum(multiplePayment, 'launch_amount')
            const multipleRetention = options.sum(multiplePayment, 'retention_total_amount')
            const value = multipleLaunchAmount - multipleRetention

            multiplePaymentCalc = (field) => field * ((element.launch_amount - element.retention_total_amount) / value)

            subTotalFine = subTotalFine + multiplePaymentCalc(firstDown?.fine)
            subTotalInterest = subTotalInterest + multiplePaymentCalc(firstDown?.interest)
            subTotalDiscount = subTotalDiscount + multiplePaymentCalc(firstDown?.discount)
            subTotalPaid = subTotalPaid + multiplePaymentCalc(firstDown?.paid)
          }

          if (firstDown?.down_type === 'unique') {
            subTotalFine = totalFine + options.sum(element.downs, 'fine')
            subTotalInterest = subTotalInterest + options.sum(element.downs, 'interest')
            subTotalDiscount = subTotalDiscount + options.sum(element.downs, 'discount')
            subTotalPaid = subTotalPaid + options.sum(element.downs, 'paid')
          }

          return ({
            ...element,
            rowspan: element.downs.length > 1 ? element.downs.length + 1 : 1,
            firstDown: {
              ...(firstDown?.down_type === 'unique') ? firstDown : {
                ...firstDown,
                fine: multiplePaymentCalc(firstDown?.fine),
                interest:multiplePaymentCalc(firstDown?.interest),
                discount: multiplePaymentCalc(firstDown?.discount),
                paid: multiplePaymentCalc(firstDown?.paid),
              }
            },
            downs: element.downs.filter((down, index) => index !== 0),
            subTotalPaid: element.downs.length > 1 ? options.sum(element.downs, 'paid') : undefined,
            document_number: documents.map(doc => doc.document_number).join(', '),
            document_date: documents.map(doc => doc.document_date).join(', '),
            detailedUrlItem: detailedUrl.replace('{{query}}', btoa(JSON.stringify({
              query: JSON.stringify({ must: [{ match: {id: item?.financial_launch_apportionment_origin_id || item.id } }] }),
            })))
          })
        }))

        return ({
          groupFieldName: item[0],
          list: list.sort((a, b) => {
            if (a.due_date < b.due_date) return -1
            if (a.due_date > b.due_date) return 1
            if (a.user_description?.toLowerCase() < b.user_description?.toLowerCase()) return -1
            if (a.user_description?.toLowerCase() > b.user_description?.toLowerCase()) return 1

            return 0
          }),
          subTotalPaid,
          subTotalAmount: options.sum(item[1], 'launch_amount'),
          subTotalDiscount,
          subTotalFine,
          subTotalInterest,
          subTotalDiff: options.sum(item[1], 'diff_paid_estimated'),
          subTotalRetention: options.sum(item[1], 'retention_total_amount'),
        })
      }))
    }

    totalDiff = options.sum(newPayload, 'diff_paid_estimated')
    totalLaunchAmount = options.sum(items, 'launch_amount')
    totalRetention = options.sum(items, 'retention_total_amount')

    const newData = {
      financialLaunchIndex: {
        items: options.groupedBy ? null : items.sort((a, b) => {
          if (a.due_date < b.due_date) return -1
          if (a.due_date > b.due_date) return 1
          if (a.user_description?.toLowerCase() < b.user_description?.toLowerCase()) return -1
          if (a.user_description?.toLowerCase() > b.user_description?.toLowerCase()) return 1

          return 0
        }),
        groupedByDueDate,
        groupedByCompany,
        groupedByEntity,
        groupedByCostCenter,
        groupedByPlanAccount,
        groupedByCustomsClearance,
        groupedByProject,
        groupedItems: options.groupedBy ? groupedItems : null,
        isGrouped,
        totalDiff,
        totalLaunchAmount,
        totalFine,
        totalDiscount,
        totalInterest,
        totalPaid,
        showFineInterestDiscount: true,
        showObservation: true,
        showRetentions: true,
        launchColspan,
        subTotalColspan,
        totalColspan,
        receivableColspan,
        colSpan,
        tdTotalSpan,
        totalRetention,
				accountingAccount: true,
				noPayload,
				noPayloadColspan: launchColspan + receivableColspan + 1,
      },
    }

    return newData
  }


  return {
    financialLaunchIndex: null,
  }
}
