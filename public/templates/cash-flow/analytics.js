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
    balanceColspan = 16,
    launchColspan = 13,
    totalColspan = 11,
    groupedColspan = 18,
    realizedBalance = 0,
    initialDownDate,
    sumRealizedBalance,
    estimatedBalance = 0,
    initialDueDate,
    sumEstimatedBalance,
    reportStatusOpen,
    reportStatusRealized,
    showBalance

  const sum = (items, prop, operation) => {
    return items.reduce((a, b) => {
      const n1 = Number(a) || null
      const n2 = Number(b[prop]) || null

      return n1 + n2
    }, 0)
  }

  const method = 'POST'
  const headers = {
    authorization,
    'Content-Type': 'application/json',
  }

  const groupBy = (xs, key) => xs.reduce((rv, x) => {
    // eslint-disable-next-line no-param-reassign
    (rv[x[key]] = rv[x[key]] || []).push(x)
    return rv
  }, {})

  const getRealizedBalance = async (down_date) => {
    const query = {
      must: [
        {
          bool: {
            should: [
              {
                match: {
                  status: "partially_paid"
                }
              },
              {
                match: {
                  status: "paid"
                }
              },
              {
                match: {
                  status: "conciliated"
                }
              }
            ]
          }
        },
        {
          nested: {
            path: "downs",
            query: {
              bool: {
                must: [
                  {
                    exists: {
                      field: "downs.id"
                    }
                  },
                  {
                    range: {
                      'downs.down_date': {
                        lt: down_date,
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      ],
      must_not: [{
        exists: {
          field: 'deleted_at',
        },
      }]
    }
    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        query: `
        {
          financialLaunchIndex(
            query: ${JSON.stringify(JSON.stringify(query))}
            aggs: {by_launch_operation: {terms: {field: "launch_operation"}, aggs: {group: {nested: {path: "downs"}, aggs: {by_downs: {terms: {field: "downs.down_type", size: 10000}, aggs: {down_date: {terms: {field: "downs.down_date", order: { _key: "desc" }, size: 10000 }, aggs: {paid: {sum: {field: "downs.paid"}}, down_net_amount: {reverse_nested: {}, aggs: {sum: {sum: {field: "down_net_amount"}}}}}}}}}}}}}
          ) {
            aggregations
            errors {
              meta {
                path
              }
              messages
            }
          }
        }        
      ` })
    })
    const { data: { financialLaunchIndex: { aggregations } } } = await response.json()

    const obj = {}

    aggregations.by_launch_operation.buckets.forEach(launch_operation => {
      const downType = {
        unique: [],
        multiple: [],
      }

      launch_operation.group.by_downs.buckets.forEach(down => {
        const multiplier = launch_operation.key === 'payable_account' ? -1 : 1

        down.down_date.buckets.filter(date => new Date(down_date) > new Date(date.key_as_string)).forEach(date => {
          if (down.key === 'unique') {
            downType[down.key].push(date.paid.value * multiplier)
          }

          if (down.key === 'multiple') {
            downType[down.key].push(date.down_net_amount.sum.value * multiplier)
          }
        })
      })

      Object.assign(obj, {
        [launch_operation.key]: {
          unique: downType.unique.reduce((a,b) => a + b, 0),
          multiple: downType.multiple.reduce((a,b) => a + b, 0),
        },
      })
    })

    return obj.receivable_account?.unique
      + obj.receivable_account?.multiple
      + obj.payable_account?.unique
      + obj.payable_account?.multiple
  }

  const getEstimatedBalance = async (due_date) => {
    const query = {
      must: [
        {
          bool: {
            should: [
              {
                match: {
                  status: "open"
                }
              },
            ]
          }
        },
        {
          range: {
            due_date: {
              lt: due_date,
            },
          }
        },
      ],
      must_not: [{
        exists: {
          field: 'deleted_at',
        },
      }]
    }
    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        query: `
        {
          financialLaunchIndex(
            query: ${JSON.stringify(JSON.stringify(query))}
            aggs: {
              by_launch_operation: {
                terms: { field: "launch_operation" }
                aggs: {
                  due_date: {
                    terms: { field: "due_date", size: 10000 }
                    aggs: { launch_amount_sum: { sum: { field: "launch_amount" } } }
                  }
                }
              }
            }
          ) {
            aggregations
            errors {
              meta {
                path
              }
              messages
            }
          }
        }        
      ` })
    })
    const { data: { financialLaunchIndex: { aggregations } } } = await response.json()

    const obj = {
      payable_account: [],
      receivable_account: [],
      discount: [],
    }

    aggregations.by_launch_operation.buckets.forEach(launch_operation => {
      const multiplier = launch_operation.key === 'payable_account' ? -1 : 1
      launch_operation.due_date.buckets.forEach(byDueDate => {
        obj[launch_operation.key].push(byDueDate.launch_amount_sum.value * multiplier)
      })
    })

    return obj.payable_account.reduce((a, b) => a + b, 0) + obj.receivable_account.reduce((a, b) => a + b, 0)
    // return 0
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

  if (options?.reportStatus?.value === 'open') {
    reportStatusOpen = true
    groupedColspan = groupedColspan -1
  }
  else if (options?.reportStatus?.value === 'realized') {
    reportStatusRealized = true
    groupedColspan = groupedColspan -1
  } else {
    reportStatusOpen = true
    reportStatusRealized = true
  }

  if (!errors) {
    initialDownDate = payload[0]?._source?.down_date
    initialDueDate = payload[0]?._source?.due_date

    if (options?.showBalance) {
      if (payload.length > 0 && reportStatusRealized ) {
        realizedBalance = await getRealizedBalance(initialDownDate)
      }
  
      if (payload.length > 0 && reportStatusOpen ) {
        estimatedBalance = await getEstimatedBalance(initialDueDate)
      }

      showBalance = true
    }

    sumRealizedBalance = realizedBalance
    sumEstimatedBalance = estimatedBalance

    const newPayload = payload.sort((a, b) => {
      if (reportStatusOpen) {
        if (a._source.due_date === b._source.due_date) {
          return 0;
        }
        else {
          return (a._source.due_date < b._source.due_date) ? -1 : 1;
        }
      }

      return undefined
    }).filter(item => {
      if (!reportStatusOpen || !reportStatusRealized) {
        if (reportStatusRealized) {
          return ['partially_paid', 'paid', 'conciliated'].includes(item._source.status)
        }
  
        if (reportStatusOpen) {
          return ['open'].includes(item._source.status)
        }
      }

      return item
    }).map(item => {
      const dateSplit = reportStatusOpen
        ? item._source.due_date?.split('-')
        : item._source.down_date?.split('-')

      return ({
        ...item._source,
        date_grouped: dateSplit ? `${dateSplit[0]}-${dateSplit[1]}` : 'SEM INFORMAÇÃO',
        entity_name: item._source.entity?.social_reason || "SEM INFORMAÇÃO",
        cost_center_name: item._source.cost_center?.name || "SEM INFORMAÇÃO",
        plan_account_name: item._source.plan_account?.name || "SEM INFORMAÇÃO",
        customs_clearance_name: item._source.customs_clearance?.name || "SEM INFORMAÇÃO",
        project_name: item._source.project?.name || "SEM INFORMAÇÃO",
        company_name: `${item._source.company?.social_reason} (${item._source.company?.national_identifier.substr(8, 4)})` || "SEM INFORMAÇÃO",
        status_grouped: item._source.status === 'open' ? 'Em aberto' : 'Realizado',
      })
    })

    const groupedBy = groupBy(newPayload, options.groupedBy)

    groupedByDate = options.groupedBy === 'date_grouped' || undefined
    groupedStatus = options.groupedBy === 'status_grouped' || undefined
    groupedByEntity = options.groupedBy === 'entity_name' || undefined
    groupedByCostCenter = options.groupedBy === 'cost_center_name' || undefined
    groupedByPlanAccount = options.groupedBy === 'plan_account_name' || undefined
    groupedByCustomsClearance = options.groupedBy === 'customs_clearance_name' || undefined
    groupedByProject = options.groupedBy === 'project_name' || undefined

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

    if (groupedByCostCenter || groupedByCustomsClearance || groupedByProject) {
      launchColspan = launchColspan - 1
      balanceColspan = balanceColspan -1
      totalColspan = totalColspan - 1
      groupedColspan = groupedColspan - 1
    }

    const groupedItems = Object.entries(groupedBy).sort((a, b) => {
      if (a[0] === b[0]) {
        return 0;
      }
      else {
        return (a[0] < b[0]) ? -1 : 1;
      }
    }).map(item => {
      let groupedField

      if (groupedByDate) {
        const split = item[0].split('-')
        groupedField = item[0] !== 'SEM INFORMAÇÃO' ? `${months[split[1]]}/${split[0]}` : item[0]
      } else {
        groupedField = item[0]
      }

      const groupedByDateField = Object.entries(groupBy(item[1], reportStatusOpen ? 'due_date' : 'down_date'))
        .map(grouped => {
          const itemsArray = []

          grouped[1].sort((a, b) => {
            if (a.user_description === b.user_description) {
              return 0;
            }
            else {
              return (a.user_description < b.user_description) ? -1 : 1;
            }
          }).forEach(item => {
            const { downs, ...newItem } = item

            if (downs?.length > 0) {
              downs.filter(downItem => new Date(initialDownDate) <= new Date(downItem.down_date)).forEach(downItem => {
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
    
                itemsArray.push({
                  ...newItem,
                  ...downItem,
                  amount_receivable,
                  amount_payable,
                  paid_payable,
                  paid_receivable,
                  diff,
                  sum_realized_balance: sumRealizedBalance,
                  sum_estimated_balance: sumEstimatedBalance,
                })
              })
            } else {
              const amount_receivable = newItem.launch_operation === 'receivable_account'
                ? newItem.launch_amount : null
              const amount_payable = newItem.launch_operation === 'payable_account'
                ? newItem.launch_amount : null

              sumEstimatedBalance = newItem.launch_operation === 'receivable_account'
                ? sumEstimatedBalance + Number(amount_receivable)
                : sumEstimatedBalance - Number(amount_payable)

              itemsArray.push({
                  ...newItem,
                  amount_receivable,
                  amount_payable,
                  sum_estimated_balance: sumEstimatedBalance,
                  sum_realized_balance: sumRealizedBalance,
              })
            }
          })

          return ({
            dateGrouped: grouped[0],
            items: itemsArray,
            subTotalLaunchAmountPayable: sum(itemsArray, 'amount_payable'),
            subTotalLaunchAmountReceivable: sum(itemsArray, 'amount_receivable'),
            subTotalDownNetAmountPayable: sum(itemsArray, 'paid_payable'),
            subTotalDownNetAmountReceivable: sum(itemsArray, 'paid_receivable'),
            subTotalDiff: sum(itemsArray, 'diff'),
            subTotalRealizedBalance: itemsArray[itemsArray.length - 1]?.sum_realized_balance,
            subTotalEstimatedBalance: itemsArray[itemsArray.length - 1]?.sum_estimated_balance,
          })
        })

      return ({
        groupedField,
        groupedByDateField,
        totalGroupedLaunchAmountPayable: sum(groupedByDateField, 'subTotalLaunchAmountPayable'),
        totalGroupedLaunchAmountReceivable: sum(groupedByDateField, 'subTotalLaunchAmountReceivable'),
        totalGroupedDownNetAmountPayable: sum(groupedByDateField, 'subTotalDownNetAmountPayable'),
        totalGroupedDownNetAmountReceivable: sum(groupedByDateField, 'subTotalDownNetAmountReceivable'),
        totalGroupedDiff: sum(groupedByDateField, 'subTotalDiff'),
        totalGroupedRealizedBalance: groupedByDateField[groupedByDateField.length -1]?.subTotalRealizedBalance,
        totalGroupedEstimatedBalance: groupedByDateField[groupedByDateField.length -1]?.subTotalEstimatedBalance,
      })
    })

    const newData = {
      financialLaunchIndex: {
        items: groupedItems,
        totalLaunchAmountPayable: sum(groupedItems, 'totalGroupedLaunchAmountPayable'),
        totalLaunchAmountReceivable: sum(groupedItems, 'totalGroupedLaunchAmountReceivable'),
        totalDownNetAmountPayable: sum(groupedItems, 'totalGroupedDownNetAmountPayable'),
        totalDownNetAmountReceivable: sum(groupedItems, 'totalGroupedDownNetAmountReceivable'),
        totalDiff: sum(groupedItems, 'totalGroupedDiff'),
        totalRealizedBalance: groupedItems[groupedItems.length - 1]?.totalGroupedRealizedBalance,
        totalEstimatedBalance: groupedItems[groupedItems.length - 1]?.totalGroupedEstimatedBalance,
        balanceColspan,
        launchColspan,
        totalColspan,
        groupedColspan,
        groupedByCostCenter,
        groupedByPlanAccount,
        groupedByCustomsClearance,
        groupedByProject,
        groupedByDate,
        groupedByEntity,
        realizedBalance,
        reportStatusOpen,
        reportStatusRealized,
        estimatedBalance,
        sumEstimatedBalance,
        showBalance,
        groupedStatus,
      }
    }
  
    return newData
  }

  return {
    financialLaunchIndex: null,
  }
}