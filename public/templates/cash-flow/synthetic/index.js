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
    sumDiffPaidEstimated = 0,
    showBalance,
    colspan = 4,
    hasPayload,
    realizedBalanceError,
    estimatedBalanceError

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

      return  options.sum(payload, 'total_received') + (-1 * options.sum(payload, 'total_paid'))
    } catch {
      realizedBalanceError = true
      return 0
    }
  }

  const getEstimatedBalance = async (dueDate) => {
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
      if (dueDate) query.must.push({
        range: {
          date: {
            lt: dueDate
          }
        }
      })

      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify({
          query: `
            query GetEstimatedBalance($query: JSON!) {
              financialLaunchEstimatedBalanceIndex(
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

      const { data: { financialLaunchEstimatedBalanceIndex: { payload } } } = await response.json()

      return options.sum(payload, 'total_received') + (-1 * options.sum(payload, 'total_paid'))
    } catch {
      estimatedBalanceError = true
      return 0
    }
  }

  const getRealizedBalanceByBankAccount = async (initialDate) => {
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
      realizedBalanceError = true
      return 0
    }
  }

  const getEstimatedBalanceByBankAccount = async (initialDate) => {
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
            query GetEstimatedBalanceByBankAccount($query: JSON!) {
              financialLaunchEstimatedBalanceByBankAccountIndex(
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

      const { data: { financialLaunchEstimatedBalanceByBankAccountIndex: { payload } } } = await response.json()

      return options.sum(payload, 'total_received') + (-1 * options.sum(payload, 'total_paid'))
    } catch (e) {
      realizedBalanceError = true
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
      realizedBalance = await getRealizedBalanceByBankAccount(initialDate)
      estimatedBalance = await getEstimatedBalanceByBankAccount(initialDate)
    } else {
      realizedBalance = await getRealizedBalance(initialDate)
      estimatedBalance = await getEstimatedBalance(initialDate)
    }
  }

  const mountObj = (payloadArray, launchOperation, thDates) => {
    const mount = Object.entries(options.groupBy(payloadArray.filter(payloadArr => payloadArr.launch_operation === launchOperation), 'plan_account_name')).map(planAccount => {
      const td = Array(thDates.length).fill('').map((value, index) => ({
        date: thDates[index].column
      }))

      const tdArray = td.map(tdItem => {
        const groupedByDate = Object.entries(options.groupBy(planAccount[1], 'due_date')).filter(date => date[0] === tdItem.date)

        if (groupedByDate.length > 0) {
          let realized = []
          let estimated = []
          let diff_paid_estimated = []

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
              diff_paid_estimated.push(Number(obj.diff_paid_estimated * multiplier))
            })
          })

          return {
            id: tdItem.date,
            realized: realized.reduce((a, b) => a + b, 0),
            estimated: estimated.reduce((a, b) => a + b, 0),
            diff_paid_estimated: diff_paid_estimated.reduce((a, b) => a + b, 0),
          }
        }

        return {
          id: tdItem.date,
          realized: 0,
          estimated: 0,
          diff_paid_estimated: 0,
        }
      })

      const subTotalRealized = options.sum(tdArray, 'realized')
      const subTotalEstimated = options.sum(tdArray, 'estimated')

      return ({
        plan_account_name: planAccount[0],
        td: tdArray,
        subTotalRealized,
        subTotalEstimated,
        diff: options.sum(tdArray, 'diff_paid_estimated'),
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
    initialDueDate = options.filterFields.must?.find(item => item?.range)?.range?.due_date?.gte

    await getInitialBalance(initialDueDate)

    showBalance = true

    sumRealizedBalance = realizedBalance
    sumEstimatedBalance = estimatedBalance

    const newPayload = payload.sort((a, b) => {
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

    if (newPayload.length > 0) hasPayload = true

    const th = Object.keys(options.groupBy(newPayload, 'due_date')).map(item => ({ column: item }))

    const subTotalPayable = []
    const payableTd = mountObj(newPayload, 'payable_account', th)
    payableTd.forEach(item => subTotalPayable.push(...item.td))

    const subTotalReceivable = []
    const receivableTd = mountObj(newPayload, 'receivable_account', th)
    receivableTd.forEach(item => subTotalReceivable.push(...item.td))

    const subTotalReceivableAccount = th.map(item => {
      const values = subTotalReceivable.filter(subTotal => subTotal.id === item.column)

      return {
        realized: options.sum(values, 'realized'),
        estimated: options.sum(values, 'estimated'),
        diff_paid_estimated: options.sum(values, 'diff_paid_estimated'),
        id: item.column,
      }
    })

    const subTotalPayableAccount = th.map(item => {
      const values = subTotalPayable.filter(subTotal => subTotal.id === item.column)

      return {
        realized: options.sum(values, 'realized'),
        estimated: options.sum(values, 'estimated'),
        diff_paid_estimated: options.sum(values, 'diff_paid_estimated'),
        id: item.column,
      }
    })

    const operatingBalance = th.map(item => {
      const payable = subTotalPayableAccount.filter(obj => obj.id === item.column)
      const receivable = subTotalReceivableAccount.filter(obj => obj.id === item.column)

      return {
        realized: options.sum(payable, 'realized') + options.sum(receivable, 'realized'),
        estimated: options.sum(payable, 'estimated') + options.sum(receivable, 'estimated'),
        diff_paid_estimated: options.sum(payable, 'diff_paid_estimated') + options.sum(receivable, 'diff_paid_estimated'),
        id: item.column,
      }
    })

    const initialBalanceSum = th.map(item => {
      const payable = subTotalPayableAccount.filter(obj => obj.id === item.column)
      const receivable = subTotalReceivableAccount.filter(obj => obj.id === item.column)

      const realized = options.sum(payable, 'realized') + options.sum(receivable, 'realized')
      const estimated = options.sum(payable, 'estimated') + options.sum(receivable, 'estimated')
      const diff_paid_estimated = options.sum(payable, 'diff_paid_estimated') + options.sum(receivable, 'diff_paid_estimated')

      sumEstimatedBalance = sumEstimatedBalance + estimated
      sumRealizedBalance = sumRealizedBalance + realized

      sumDiffPaidEstimated += diff_paid_estimated

      return {
        sumEstimatedBalance,
        sumRealizedBalance,
        diff: sumDiffPaidEstimated,
        id: item.column,
      }
    })

    const thInitialBalance = initialBalanceSum.filter((value, index) => index !==  initialBalanceSum.length -1)

    const newData = {
      financialLaunchIndex: {
        th,
        showBalance,
        hasPayload,
        colspan: colspan + (th.length * 2),
        payableTd,
        receivableTd,
        subTotalReceivableAccount,
        sumSubTotalReceivableRealized: options.sum(subTotalReceivableAccount, 'realized'),
        sumSubTotalReceivableEstimated: options.sum(subTotalReceivableAccount, 'estimated'),
        diffReceivable: options.sum(subTotalReceivableAccount, 'diff_paid_estimated'),
        sumSubTotalPayableRealized: options.sum(subTotalPayableAccount, 'realized'),
        sumSubTotalPayableEstimated: options.sum(subTotalPayableAccount, 'estimated'),
        diffPayable: options.sum(subTotalPayableAccount, 'diff_paid_estimated'),
        subTotalPayableAccount,
        operatingBalance,
        operatingBalanceEstimated: options.sum(operatingBalance, 'estimated'),
        operatingBalanceRealized: options.sum(operatingBalance, 'realized'),
        operatingBalanceDiff: options.sum(operatingBalance, 'diff_paid_estimated'),
        realizedBalance,
        estimatedBalance,
        initialDiff: estimatedBalance + realizedBalance,
        thInitialBalance,
        thFinalBalance: initialBalanceSum,
        totalBalance: {
          ...initialBalanceSum[initialBalanceSum.length -1],
          diff: options.sum(operatingBalance, 'diff_paid_estimated') + estimatedBalance + realizedBalance,
        },
        realizedBalanceError,
        estimatedBalanceError,
      },
    }

    return newData
  }


  return {
    financialLaunchIndex: null,
  }
}
