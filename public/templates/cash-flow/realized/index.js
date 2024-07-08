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
    balanceColspan = 17,
    launchColspan = 14,
    totalColspan = 12,
    groupedColspan = 19,
    realizedBalance = 0,
    paymentColspan = 3,
    initialDownDate,
    sumRealizedBalance,
    showBalance,
    showRetentions,
    showFineInterestDiscount,
    error

  // Init
  showBalance = true
  showFineInterestDiscount = true
  balanceColspan += 3
  groupedColspan += 3
  paymentColspan += 3
  showRetentions = true
  balanceColspan += 1
  groupedColspan += 1
  launchColspan += 1
  totalColspan += 1

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

  balanceColspan += 1
  groupedColspan += 1
  paymentColspan += 1

  const rangeDownDate = options.filterFields.must
    ?.find(item => item.nested?.path === 'downs')?.nested?.query?.bool?.must
    ?.find(item => item?.range)?.range

  initialDownDate = rangeDownDate ? rangeDownDate['downs.down_date']?.gte : undefined

  const downDates = []

	payload.forEach(item => {
    const innerHits = item?.inner_hits?.downs?.hits?.hits
    if (innerHits) {
      innerHits?.forEach((downs) => {
        downDates.push(downs._source.down_date)
      })
    } else {
      item._source.downs?.forEach((downs) => {
        downDates.push(downs.down_date)
      })
    }
  })

  const onlyUnique = (value, index, array)=> {
    return array.indexOf(value) === index;
  }

  let initialDate

  if (options.filterFields?.must?.find(item => item?.range)) {
    initialDate = options.filterFields?.must?.find(item => item?.range)?.range?.due_date?.gte
  } else if (rangeDownDate) {
    initialDate = rangeDownDate['downs.down_date']?.gte
  } else {
    initialDate = downDates.filter(onlyUnique).sort((a, b) => {
      if (a === b) {
        return 0;
      }
      else {
        return (a < b) ? -1 : 1;
      }
    })[0]
  }

  await getInitialBalance(initialDate)

  if (!errors) {
    sumRealizedBalance = realizedBalance

    const newPayload = []

    payload.forEach(item => {
      let launchAmount

      if (rangeDownDate) {
        const due_date = new Date(item._source.due_date)
        const gte = new Date(`${rangeDownDate['downs.down_date'].gte} GMT -0300`)
        const lte = new Date(`${rangeDownDate['downs.down_date'].lte} GMT -0300`)
        launchAmount = due_date >= gte && due_date <= lte ? item._source.launch_amount : null
      } else {
        launchAmount = item._source.launch_amount
      }

      if (initialDownDate) {
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
            downs: [downs._source],
            ...downs._source,
            launch_amount: index > 0 ? 0 : launchAmount,
            retention_total_amount: index > 0 ? 0 : item._source.retention_total_amount,
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
              entity_name: item._source.entity?.social_reason || "SEM INFORMAÇÃO",
              cost_center_name: item._source.cost_center?.name || "SEM INFORMAÇÃO",
              plan_account_name: item._source.plan_account?.name || "SEM INFORMAÇÃO",
              customs_clearance_name: item._source.customs_clearance?.reference || "SEM INFORMAÇÃO",
              project_name: item._source.project?.name || "SEM INFORMAÇÃO",
              company_name: `${item._source.company?.fancy_name || item._source.company?.social_reason} (${item._source.company?.national_identifier.substr(8, 4)})` || "SEM INFORMAÇÃO",
              downs: [downItem],
              ...downItem,
              launch_amount: index > 0 ? 0 : launchAmount,
              retention_total_amount: index > 0 ? 0 : item._source.retention_total_amount,
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
            downs: downsArray,
          })
        }

      }
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

      const groupedByDateField = Object.entries(options.groupBy(item[1], 'down_date'))
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
                })
              })
            } else {
              const amount_receivable = newItem.launch_operation === 'receivable_account'
                ? newItem.launch_amount : null
              const amount_payable = newItem.launch_operation === 'payable_account'
                ? newItem.launch_amount : null

                const diff = newItem.launch_operation === 'receivable_account'
                  ? (Number(amount_receivable) * -1) + Number(newItem.retention_total_amount)
                  : Number(amount_payable) - Number(newItem.retention_total_amount)

              itemsArray.push({
                  ...newItem,
                  amount_receivable,
                  amount_payable,
                  sum_realized_balance: sumRealizedBalance,
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
            subTotalRealizedBalance: itemsArray[itemsArray.length - 1]?.sum_realized_balance,
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
        totalGroupedRealizedBalance: groupedByDateField[groupedByDateField.length -1]?.subTotalRealizedBalance,
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
        totalRealizedBalance: groupedItems[groupedItems.length - 1]?.totalGroupedRealizedBalance || sumRealizedBalance,
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
        showBalance,
        showFineInterestDiscount,
        showRetentions,
        paymentColspan,
        error,
      }
    }

    return newData
  }

  return {
    financialLaunchIndex: null,
  }
}
