/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
  /**
   * SE down_type = multiple e launch_operation === payable_account => down_net_amount
   * SE down_type = multiple e launch_operation === receivable => down_net_amount
   * SE down_type = unique e launch_operation === payable_account => downs.paid
   * SE down_type = unique e launch_operation === receivable => downs.paid
   */

  let realizedBalance = 0,
    sumRealizedBalance,
    estimatedBalance = 0,
    initialDueDate,
    sumEstimatedBalance,
    showBalance,
    colspan = 4

  const method = 'POST'
  const headers = {
    authorization,
    'Content-Type': 'application/json',
  }

  const sum = (items, prop, operation) => {
    return items.reduce((a, b) => {
      const n1 = Number(a) || null
      const n2 = Number(b[prop]) || null

      return n1 + n2
    }, 0)
  }

  const groupBy = (xs, key) => xs.reduce((rv, x) => {
    // eslint-disable-next-line no-param-reassign
    (rv[x[key]] = rv[x[key]] || []).push(x)
    return rv
  }, {})

  const getRealizedBalance = async (due_date) => {
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
          range: {
            due_date: {
              lt: due_date,
            },
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
        query RealizedBalance{
          financialLaunchIndex(
            query: ${JSON.stringify(JSON.stringify(query))}
            aggs: {
              by_launch_operation: {
                terms: { field: "launch_operation" }
                aggs: {
                  by_date: {
                    terms: { field:"due_date", size: 10000 }
                    aggs: {
                       group: {
                        nested: { path: "downs" }
                        aggs: {
                          by_downs: {
                            terms: { field: "downs.down_type", size: 10000 }
                            aggs: {
                              paid: { sum: { field: "downs.paid" } }
                              down_net_amount: {
                                reverse_nested: {}
                                aggs: { sum: { sum: { field: "down_net_amount" } } }
                              }
                            }
                          }
                        }
                      }
                    }
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

    const obj = {}

    aggregations.by_launch_operation.buckets.forEach(launch_operation => {
      const downType = {
        unique: [],
        multiple: [],
      }

      launch_operation.by_date.buckets
        .filter(date => new Date(due_date) > new Date(date.key_as_string))
        .forEach(date => date.group.by_downs.buckets.forEach(down => {
          const multiplier = launch_operation.key === 'payable_account' ? -1 : 1

          if (down.key === 'unique') {
            downType[down.key].push(down.paid.value * multiplier)
          }

          if (down.key === 'multiple') {
            downType[down.key].push(down.down_net_amount.sum.value * multiplier)
          }
        }))

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
        query EstimatedBalance {
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
  }

  const mountObj = (payloadArray, launchOperation, thDates) => {
    const mount = Object.entries(groupBy(payloadArray.filter(payloadArr => payloadArr.launch_operation === launchOperation), 'plan_account_name')).map(planAccount => {
      const td = Array(thDates.length).fill('').map((value, index) => ({
        date: thDates[index].column
      }))

      const tdArray = td.map(tdItem => {
        const groupedByDate = Object.entries(groupBy(planAccount[1], 'due_date')).filter(date => date[0] === tdItem.date)

        if (groupedByDate.length > 0) {
          let realized = []
          let estimated = []

          groupedByDate.forEach(item => {
            item[1].forEach(obj => {
              const multiplier = obj.launch_operation === 'payable_account' ? -1 : 1

              let tdValueEstimated = Number(obj.launch_amount)
              let tdValueRealized = 0

              if (obj.downs.length > 0) {
                tdValueRealized = obj.downs.map(down => {
                  if (down.down_type === 'unique') {
                    return Number(down.paid)
                  }
          
                  return Number(obj.down_net_amount)
                }).reduce((a, b) => a + b, 0)
              } else {
                tdValueEstimated = Number(obj.launch_amount)
              }

              realized.push(tdValueRealized * multiplier)
              estimated.push(tdValueEstimated * multiplier)
            })
          })

          return {
            id: tdItem.date,
            realized: realized.reduce((a, b) => a + b, 0),
            estimated: estimated.reduce((a, b) => a + b, 0),
          }
        }

        return {
          id: tdItem.date,
          realized: 0,
          estimated: 0,
        }
      })

      const subTotalRealized = sum(tdArray, 'realized')
      const subTotalEstimated = sum(tdArray, 'estimated')

      return ({
        plan_account_name: planAccount[0],
        td: tdArray,
        subTotalRealized,
        subTotalEstimated,
        diff: subTotalEstimated - subTotalRealized,
      })
    })

    return mount.sort((a, b) => {
      if (a.plan_account_name === b.plan_account_name) {
        return 0;
      }
      else {
        return (a.plan_account_name < b.plan_account_name) ? -1 : 1;
      }
    })
  }


  const {
    financialLaunchIndex: {
      payload,
      errors,
    },
  } = data

  if (!errors) {
    initialDueDate = payload[0]?._source?.due_date

    if (options?.showBalance) {
      realizedBalance = await getRealizedBalance(initialDueDate)
      estimatedBalance = await getEstimatedBalance(initialDueDate)
      showBalance = true
    }

    sumRealizedBalance = realizedBalance
    sumEstimatedBalance = estimatedBalance

    const newPayload = payload.filter(item => {
      if (options.conciliatedOnly) {
        return 'conciliated' === item._source.status
      }

      return item
    }).sort((a, b) => {
      if (a._source.due_date === b._source.due_date) {
        return 0;
      }
      else {
        return (a._source.due_date < b._source.due_date) ? -1 : 1;
      }
    }).map(item => {
      const dateSplit = item._source.due_date?.split('-')

      return ({
        ...item._source,
        due_date: options.showBy?.value === 'month' ? `${dateSplit[1]}/${dateSplit[0]}` : `${dateSplit[2]}/${dateSplit[1]}/${dateSplit[0]}`,
        plan_account_name: item._source.plan_account ? `${item._source.plan_account?.reference} - ${item._source.plan_account?.name}` : 'Não informado',
      })
    })

    const th = Object.keys(groupBy(newPayload, 'due_date')).map(item => ({ column: item }))

    const subTotalPayable = []
    const payableTd = mountObj(newPayload, 'payable_account', th)
    payableTd.forEach(item => subTotalPayable.push(...item.td))

    const subTotalReceivable = []
    const receivableTd = mountObj(newPayload, 'receivable_account', th)
    receivableTd.forEach(item => subTotalReceivable.push(...item.td))

    const subTotalReceivableAccount = th.map(item => {
      const values = subTotalReceivable.filter(subTotal => subTotal.id === item.column)

      return {
        realized: sum(values, 'realized'),
        estimated: sum(values, 'estimated'),
        id: item.column,
      }
    })

    const subTotalPayableAccount = th.map(item => {
      const values = subTotalPayable.filter(subTotal => subTotal.id === item.column)

      return {
        realized: sum(values, 'realized'),
        estimated: sum(values, 'estimated'),
        id: item.column,
      }
    })

    const operatingBalance = th.map(item => {
      const payable = subTotalPayableAccount.filter(obj => obj.id === item.column)
      const receivable = subTotalReceivableAccount.filter(obj => obj.id === item.column)

      return {
        realized: sum(payable, 'realized') + sum(receivable, 'realized'),
        estimated: sum(payable, 'estimated') + sum(receivable, 'estimated'),
        id: item.column,
      }
    })

    const initialBalanceSum = th.map(item => {
      const payable = subTotalPayableAccount.filter(obj => obj.id === item.column)
      const receivable = subTotalReceivableAccount.filter(obj => obj.id === item.column)

      const realized = sum(payable, 'realized') + sum(receivable, 'realized')
      const estimated = sum(payable, 'estimated') + sum(receivable, 'estimated')

      sumEstimatedBalance = sumEstimatedBalance + estimated
      sumRealizedBalance = sumRealizedBalance + realized

      return {
        sumEstimatedBalance,
        sumRealizedBalance,
        diff: sumEstimatedBalance - sumRealizedBalance,
        id: item.column,
      }
    })

    const thInitialBalance = initialBalanceSum.filter((value, index) => index !==  initialBalanceSum.length -1)

    const newData = {
      financialLaunchIndex: {
        th,
        showBalance,
        colspan: colspan + (th.length * 2),
        payableTd,
        receivableTd,
        subTotalReceivableAccount,
        sumSubTotalReceivableRealized: sum(subTotalReceivableAccount, 'realized'),
        sumSubTotalReceivableEstimated: sum(subTotalReceivableAccount, 'estimated'),
        diffReceivable: sum(subTotalReceivableAccount, 'estimated') - sum(subTotalReceivableAccount, 'realized'),
        sumSubTotalPayableRealized: sum(subTotalPayableAccount, 'realized'),
        sumSubTotalPayableEstimated: sum(subTotalPayableAccount, 'estimated'),
        diffPayable: sum(subTotalPayableAccount, 'estimated') - sum(subTotalPayableAccount, 'realized'),
        subTotalPayableAccount,
        operatingBalance,
        operatingBalanceEstimated: sum(operatingBalance, 'estimated'),
        operatingBalanceRealized: sum(operatingBalance, 'realized'),
        operatingBalanceDiff: sum(operatingBalance, 'estimated') - sum(operatingBalance, 'realized'),
        realizedBalance,
        estimatedBalance,
        thInitialBalance,
        thFinalBalance: initialBalanceSum,
        totalBalance: { ...initialBalanceSum[initialBalanceSum.length -1] },
      },
    }

    return newData
  }


  return {
    financialLaunchIndex: null,
  }
}
