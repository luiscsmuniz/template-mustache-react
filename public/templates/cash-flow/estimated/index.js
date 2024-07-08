/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
  /**
   * SE down_type = multiple e launch_operation === payable_account => down_net_amount
   * SE down_type = multiple e launch_operation === receivable => down_net_amount
   * SE down_type = unique e launch_operation === payable_account => downs.paid
   * SE down_type = unique e launch_operation === receivable => downs.paid
   */

  let groupedByDate,
    groupedByEntity,
    groupedByCostCenter,
    groupedByPlanAccount,
    groupedByCustomsClearance,
    groupedByProject,
    groupedByCompany,
    balanceColspan = 14,
    launchColspan = 14,
    totalColspan = 12,
    groupedColspan = 19,
    estimatedBalance = 0,
    initialDueDate,
    sumEstimatedBalance,
    showBalance,
    error

  // Init
  showBalance = true

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

  const getRealizedBalanceByBankAccount = async (downDate) => {
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

      const bankAccountMustNot = {}

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

  const getInitialBalance = async () => {
    initialDueDate = options.filterFields.must.find(item => item.range.due_date).range.due_date.gte
     || payload?.map(item => item._source.due_date).sort((a, b) => a.localeCompare(b))[0]

    const bankAccountMust = options.filterFields?.must?.find(item => item?.nested?.path === 'bank_account')
    const bankAccountMustNot = options.filterFields?.must_not?.find(item => item?.nested?.path === 'bank_account')

    if (bankAccountMust || bankAccountMustNot) {
      estimatedBalance = await getRealizedBalanceByBankAccount(initialDueDate)
    } else {
      estimatedBalance = await getRealizedBalance(initialDueDate)
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

  await getInitialBalance(payload)

  if (!errors) {
    sumEstimatedBalance = estimatedBalance

    const newPayload = []

    payload.sort((a, b) => {
      if (a._source.due_date === b._source.due_date) {
        return 0;
      }
      else {
        return (a._source.due_date < b._source.due_date) ? -1 : 1;
      }
    }).forEach(item => {
      const dateSplit = item._source.due_date?.split('-')
      const downsArray =  item?.inner_hits?.downs?.hits?.hits?.map(downs => downs._source) || item._source.downs

      newPayload.push({
        ...item._source,
        date_grouped: dateSplit ? `${dateSplit[0]}-${dateSplit[1]}` : 'SEM INFORMAÇÃO',
        entity_name: item._source.entity?.social_reason || "SEM INFORMAÇÃO",
        cost_center_name: item._source.cost_center?.name || "SEM INFORMAÇÃO",
        plan_account_name: item._source.plan_account?.name || "SEM INFORMAÇÃO",
        customs_clearance_name: item._source.customs_clearance?.reference || "SEM INFORMAÇÃO",
        project_name: item._source.project?.name || "SEM INFORMAÇÃO",
        company_name: `${item._source.company?.fancy_name || item._source.company?.social_reason} (${item._source.company?.national_identifier.substr(8, 4)})` || "SEM INFORMAÇÃO",
        downs: downsArray,
      })
    })

    const groupedBy = options.groupBy(newPayload, options.groupedBy)

    groupedByDate = options.groupedBy === 'date_grouped' || undefined
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

      const groupedByDateField = Object.entries(options.groupBy(item[1], 'due_date'))
        .map(grouped => {
          const itemsArray = []

          grouped[1].sort((a, b) => {
            if (a.user_description?.toLowerCase() === b.user_description?.toLowerCase()) {
              return 0;
            }
            else {
              return (a.user_description?.toLowerCase() < b.user_description?.toLowerCase()) ? -1 : 1;
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
                  ? Number(paid_receivable) + Number(newItem.retention_total_amount) + Number(downItem.discount) - Number(downItem.fine) - Number(downItem.interest) - Number(amount_receivable)
                  : Number(amount_payable) - Number(newItem.retention_total_amount) - Number(downItem.discount) + Number(downItem.fine) + Number(downItem.interest) - Number(paid_payable)

                itemsArray.push({
                  ...newItem,
                  ...downItem,
                  amount_receivable,
                  amount_payable,
                  paid_payable,
                  paid_receivable,
                  diff,
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

                const diff = newItem.launch_operation === 'receivable_account'
                  ? (Number(amount_receivable) * -1) + Number(newItem.retention_total_amount)
                  : Number(amount_payable) - Number(newItem.retention_total_amount)

              itemsArray.push({
                  ...newItem,
                  amount_receivable,
                  amount_payable,
                  sum_estimated_balance: sumEstimatedBalance,
                  diff,
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
            subTotalFine: options.sum(itemsArray, 'fine'),
            subTotalInterest: options.sum(itemsArray, 'interest'),
            subTotalDiscount: options.sum(itemsArray, 'discount'),
            subTotalDiff: options.sum(itemsArray, 'diff'),
            subTotalEstimatedBalance: itemsArray[itemsArray.length - 1]?.sum_estimated_balance,
          })
        })

      return ({
        groupedField,
        groupedByDateField,
        totalGroupedLaunchAmountPayable: options.sum(groupedByDateField, 'subTotalLaunchAmountPayable'),
        totalGroupedLaunchAmountReceivable: options.sum(groupedByDateField, 'subTotalLaunchAmountReceivable'),
        totalGroupedDownNetAmountPayable: options.sum(groupedByDateField, 'subTotalDownNetAmountPayable'),
        totalGroupedDownNetAmountReceivable: options.sum(groupedByDateField, 'subTotalDownNetAmountReceivable'),
        totalGroupedFine: options.sum(groupedByDateField, 'subTotalFine'),
        totalGroupedInterest: options.sum(groupedByDateField, 'subTotalInterest'),
        totalGroupedDiscount: options.sum(groupedByDateField, 'subTotalDiscount'),
        totalGroupedDiff: options.sum(groupedByDateField, 'subTotalDiff'),
        totalGroupedEstimatedBalance: groupedByDateField[groupedByDateField.length -1]?.subTotalEstimatedBalance,
      })
    })

    const newData = {
      financialLaunchIndex: {
        items: groupedItems,
        totalLaunchAmountPayable: options.sum(groupedItems, 'totalGroupedLaunchAmountPayable'),
        totalLaunchAmountReceivable: options.sum(groupedItems, 'totalGroupedLaunchAmountReceivable'),
        totalDownNetAmountPayable: options.sum(groupedItems, 'totalGroupedDownNetAmountPayable'),
        totalDownNetAmountReceivable: options.sum(groupedItems, 'totalGroupedDownNetAmountReceivable'),
        totalFine: options.sum(groupedItems, 'totalGroupedFine'),
        totalInterest: options.sum(groupedItems, 'totalGroupedInterest'),
        totalDiscount: options.sum(groupedItems, 'totalGroupedDiscount'),
        totalDiff: options.sum(groupedItems, 'totalGroupedDiff'),
        totalEstimatedBalance: groupedItems[groupedItems.length - 1]?.totalGroupedEstimatedBalance || sumEstimatedBalance,
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
        estimatedBalance,
        sumEstimatedBalance,
        showBalance,
        error,
      }
    }

    return newData
  }

  return {
    financialLaunchIndex: null,
  }
}
