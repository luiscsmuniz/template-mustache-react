/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
  const dreCategory ={
    '(+) RECEITA OPERACIONAL BRUTA': {
      'Vendas de serviços': [],
      'Vendas de mercadorias': [],
      'Vendas de produtos': [],
    },
    '(-) DEDUÇÃO DA RECEITA BRUTA': {
      'Impostos e contribuições incidentes sobre vendas': [],
      'Abatimentos': [],
      'Devoluções de vendas': [],
    },
    '(-) CUSTOS DAS VENDAS': {
      'Custo dos serviços prestados': [],
      'Custo das mercadorias': [],
      'Custo dos produtos vendidos': [],
    },
    '(-) DESPESAS OPERACIONAIS': {
      'Despesas administrativas' : [],
      'Despesas com vendas' : [],
    },
    '(-) DESPESAS FINANCEIRAS LÍQUIDAS': {
      '(+) Variações monetárias e cambiais ativas': [],
      '(-) Variações monetárias e cambiais passivas': [],
      '(+) Receitas financeiras': [],
      '(-) Despesas financeiras': [],
    },
    'OUTRAS RECEITAS E DESPESAS': {
      '(-) Outras despesas': [],
      '(+) Outras receitas': [],
      '(-) Custo da venda de bens e direitos do ativo não circulante': [],
      '(+) Venda de bens e direitos do ativo não circulante': [],
      '(+) Resultado da equivalência patrimonial': [],
    },
    '(-) Provisão para IR e CSLL': [],
    '(-) Debêntures, Empregados, Participações de Administradores, Partes Beneficiárias, Fundos de Assistência e Previdência para Empregados': [],
  }

  const {
    bankAccountMovementIndex: {
      payload,
    },
  } = data

  if (payload) {
    const newPayload = []

    payload.forEach(element => {
      element.inner_hits.installments.hits.hits.forEach(installment => {
        installment.inner_hits['installments.plan_account'].hits.hits.forEach(planAccount => {
          planAccount.inner_hits['installments.plan_account.dre_category'].hits.hits.forEach(dre => {
            newPayload.push({
              ...element._source,
              dre_category_name: dre._source.name || "SEM INFORMAÇÃO",
              dre_category_parent: dre._source.parent || "SEM INFORMAÇÃO",
              installment_amount: installment._source.amount,
              plan_account_name: `${planAccount._source.reference}/${planAccount._source.name}`,
              installments: {
                ...installment._source,
                plan_account: {
                  dre_category: { ...dre._source },
                  ...planAccount._source,
                }
              }
            })
          })
        })
      })
    })

    Object.entries(options.groupBy(newPayload, 'dre_category_parent')).forEach(item => {
      if (item[0] !== 'SEM INFORMAÇÃO') {
        Object.entries(options.groupBy(item[1], 'dre_category_name')).forEach(arr => {
          const planAccountArray = Object.entries(options.groupBy(arr[1], 'plan_account_name')).map(planAccount => {
            const planAccountName = planAccount[0].split('/')

            return ({
              planAccountReference: planAccountName[0],
              planAccountName: planAccountName[1],
              subTotalPlanAccount: options.sum(planAccount[1], 'installment_amount'),
            })
          }).sort((a, b) => {
            if (a.planAccountReference === b.planAccountReference) {
              return 0;
            }
            else {
              return (a.planAccountReference < b.planAccountReference) ? -1 : 1;
            }
          })

          dreCategory[item[0]][arr[0]].push(...planAccountArray)
        })
      } else {
        Object.entries(options.groupBy(item[1], 'dre_category_name')).forEach(arr => {
          const planAccountArray = Object.entries(options.groupBy(arr[1], 'plan_account_name')).map(planAccount => {
            const planAccountName = planAccount[0].split('/')
            return ({
              planAccountReference: planAccountName[0],
              planAccountName: planAccountName[1],
              subTotalPlanAccount: options.sum(planAccount[1], 'installment_amount')
            })
          }).sort((a, b) => {
            if (a.planAccountReference === b.planAccountReference) {
              return 0;
            }
            else {
              return (a.planAccountReference < b.planAccountReference) ? -1 : 1;
            }
          })

          dreCategory[arr[0]].push(...planAccountArray)
        })
      }
    })

    // Tipo de relatório
    const synthetic = options?.reportType?.value === 'synthetic'

    // categoria: (+) RECEITA OPERACIONAL BRUTA
    let productSales = dreCategory['(+) RECEITA OPERACIONAL BRUTA']['Vendas de produtos']
    let merchandiseSales = dreCategory['(+) RECEITA OPERACIONAL BRUTA']['Vendas de mercadorias']
    let serviceSales = dreCategory['(+) RECEITA OPERACIONAL BRUTA']['Vendas de serviços']
    const productSalesTotal = options.sum(productSales, 'subTotalPlanAccount')
    const merchandiseSalesTotal = options.sum(merchandiseSales, 'subTotalPlanAccount')
    const serviceSalesTotal = options.sum(serviceSales, 'subTotalPlanAccount')
    const grossOperatingIncomeTotal = productSalesTotal + merchandiseSalesTotal + serviceSalesTotal

    // categoria: (-) DEDUÇÃO DA RECEITA BRUTA
    let rebates = dreCategory['(-) DEDUÇÃO DA RECEITA BRUTA']['Abatimentos']
    let returns = dreCategory['(-) DEDUÇÃO DA RECEITA BRUTA']['Devoluções de vendas']
    let taxes = dreCategory['(-) DEDUÇÃO DA RECEITA BRUTA']['Impostos e contribuições incidentes sobre vendas']
    const rebatesTotal = options.sum(rebates, 'subTotalPlanAccount')
    const returnsTotal = options.sum(returns, 'subTotalPlanAccount')
    const taxesTotal = options.sum(taxes, 'subTotalPlanAccount')
    const deductionGrossRevenueTotal = rebatesTotal + returnsTotal + taxesTotal

    // categoria: (-) CUSTOS DAS VENDAS
    let productSalesCosts = dreCategory['(-) CUSTOS DAS VENDAS']['Custo dos produtos vendidos']
    let merchandiseCosts = dreCategory['(-) CUSTOS DAS VENDAS']['Custo das mercadorias']
    let serviceCosts = dreCategory['(-) CUSTOS DAS VENDAS']['Custo dos serviços prestados']
    const productSalesCostsTotal = options.sum(productSalesCosts, 'subTotalPlanAccount')
    const merchandiseCostsTotal = options.sum(merchandiseCosts, 'subTotalPlanAccount')
    const serviceCostsTotal = options.sum(serviceCosts, 'subTotalPlanAccount')
    const salesCostsTotal = productSalesCostsTotal + merchandiseCostsTotal + serviceCostsTotal

    // categoria: (-) DESPESAS OPERACIONAIS
    let administrativeCosts = dreCategory['(-) DESPESAS OPERACIONAIS']['Despesas administrativas']
    let sellingExpenses = dreCategory['(-) DESPESAS OPERACIONAIS']['Despesas com vendas']
    const administrativeCostsTotal = options.sum(administrativeCosts, 'subTotalPlanAccount')
    const sellingExpensesTotal = options.sum(sellingExpenses, 'subTotalPlanAccount')
    const operationalExpensesTotal = administrativeCostsTotal + sellingExpensesTotal

    // categoria: (-) DESPESAS FINANCEIRAS LÍQUIDAS
    let financialIncome = dreCategory['(-) DESPESAS FINANCEIRAS LÍQUIDAS']['(+) Receitas financeiras']
    let financialExpenses = dreCategory['(-) DESPESAS FINANCEIRAS LÍQUIDAS']['(-) Despesas financeiras']
    let activeMonetaryExchangeVariations = dreCategory['(-) DESPESAS FINANCEIRAS LÍQUIDAS']['(+) Variações monetárias e cambiais ativas']
    let passiveMonetaryExchangeVariations = dreCategory['(-) DESPESAS FINANCEIRAS LÍQUIDAS']['(-) Variações monetárias e cambiais passivas']
    const financialIncomeTotal = options.sum(financialIncome, 'subTotalPlanAccount')
    const financialExpensesTotal = options.sum(financialExpenses, 'subTotalPlanAccount')
    const activeMonetaryExchangeVariationsTotal = options.sum(activeMonetaryExchangeVariations, 'subTotalPlanAccount')
    const passiveMonetaryExchangeVariationsTotal = options.sum(passiveMonetaryExchangeVariations, 'subTotalPlanAccount')
    const netFinancialExpensesTotal = financialIncomeTotal + financialExpensesTotal + activeMonetaryExchangeVariationsTotal + passiveMonetaryExchangeVariationsTotal

    // categoria: OUTRAS RECEITAS E DESPESAS
    let otherIncome = dreCategory['OUTRAS RECEITAS E DESPESAS']['(+) Outras receitas']
    let otherExpenses = dreCategory['OUTRAS RECEITAS E DESPESAS']['(-) Outras despesas']
    let equityAccountingResult = dreCategory['OUTRAS RECEITAS E DESPESAS']['(+) Resultado da equivalência patrimonial']
    let nonCurrentAssetSales = dreCategory['OUTRAS RECEITAS E DESPESAS']['(+) Venda de bens e direitos do ativo não circulante']
    let nonCurrentAssetSalesCost = dreCategory['OUTRAS RECEITAS E DESPESAS']['(-) Custo da venda de bens e direitos do ativo não circulante']
    const otherIncomeTotal = options.sum(otherIncome, 'subTotalPlanAccount')
    const otherExpensesTotal = options.sum(otherExpenses, 'subTotalPlanAccount')
    const equityAccountingResultTotal = options.sum(equityAccountingResult, 'subTotalPlanAccount')
    const nonCurrentAssetSalesTotal = options.sum(nonCurrentAssetSales, 'subTotalPlanAccount')
    const nonCurrentAssetSalesCostTotal = options.sum(nonCurrentAssetSalesCost, 'subTotalPlanAccount')
    const otherIncomeExpensesTotal = otherIncomeTotal + otherExpensesTotal + equityAccountingResultTotal + nonCurrentAssetSalesTotal + nonCurrentAssetSalesCostTotal

    // categoria: (-) Provisão para IR e CSLL

    let provisionIRCSLL = dreCategory['(-) Provisão para IR e CSLL']
    const provisionIRCSLLTotal = options.sum(provisionIRCSLL, 'subTotalPlanAccount')

    // categoria: (-) Debêntures, Empregados, Participações de Administradores, Partes Beneficiárias, Fundos de Assistência e Previdência para Empregados
    let debenturesEmployeesAdministratorsShares = dreCategory['(-) Debêntures, Empregados, Participações de Administradores, Partes Beneficiárias, Fundos de Assistência e Previdência para Empregados']
    const debenturesEmployeesAdministratorsSharesTotal = options.sum(debenturesEmployeesAdministratorsShares, 'subTotalPlanAccount')

    // RECEITA OPERACIONAL LIQUIDA
    const netOperatingRevenue = grossOperatingIncomeTotal + deductionGrossRevenueTotal

    // RESULTADO OPERACIONAL BRUTO
    const grossOperatingResults = netOperatingRevenue + salesCostsTotal

    // RESULTADO OPERACIONAL ANTES DO IR E CSLL
    const operatingIncomeBeforeIRCSLL = grossOperatingResults
      + operationalExpensesTotal
      + netFinancialExpensesTotal
      + otherIncomeExpensesTotal

    // LUCRO LÍQUIDO ANTES DAS PARTICIPAÇÕES
    const netIncomeBeforeParticipations = operatingIncomeBeforeIRCSLL + provisionIRCSLLTotal

    // RESULTADO LÍQUIDO DO EXERCÍCIO
    const netIncomeFinancialYear = netIncomeBeforeParticipations + debenturesEmployeesAdministratorsSharesTotal

    if (synthetic) {
      productSales = []
      merchandiseSales = []
      serviceSales = []
      rebates = []
      returns = []
      taxes = []
      productSalesCosts = []
      merchandiseCosts = []
      serviceCosts = []
      administrativeCosts = []
      sellingExpenses = []
      financialIncome = []
      financialExpenses = []
      activeMonetaryExchangeVariations = []
      passiveMonetaryExchangeVariations = []
      otherIncome = []
      otherExpenses = []
      equityAccountingResult = []
      nonCurrentAssetSales = []
      nonCurrentAssetSalesCost = []
      provisionIRCSLL = []
      debenturesEmployeesAdministratorsShares = []
    }

    const newData = {
      bankAccountMovementIndex: {
        netOperatingRevenue,
        grossOperatingResults,
        netIncomeBeforeParticipations,
        netIncomeFinancialYear,
        operatingIncomeBeforeIRCSLL,
        grossOperatingIncome: {
          productSales,
          merchandiseSales,
          serviceSales,
          productSalesTotal,
          merchandiseSalesTotal,
          serviceSalesTotal,
          grossOperatingIncomeTotal,
        },
        deductionGrossRevenue: {
          rebates,
          returns,
          taxes,
          rebatesTotal,
          returnsTotal,
          taxesTotal,
          deductionGrossRevenueTotal,
        },
        salesCosts: {
          productSalesCosts,
          merchandiseCosts,
          serviceCosts,
          productSalesCostsTotal,
          merchandiseCostsTotal,
          serviceCostsTotal,
          salesCostsTotal,
        },
        operationalExpenses: {
          administrativeCosts,
          sellingExpenses,
          administrativeCostsTotal,
          sellingExpensesTotal,
          operationalExpensesTotal,
        },
        netFinancialExpenses: {
          financialIncome,
          financialExpenses,
          activeMonetaryExchangeVariations,
          passiveMonetaryExchangeVariations,
          financialIncomeTotal,
          financialExpensesTotal,
          activeMonetaryExchangeVariationsTotal,
          passiveMonetaryExchangeVariationsTotal,
          netFinancialExpensesTotal,
        },
        otherIncomeExpenses: {
          otherIncome,
          otherExpenses,
          equityAccountingResult,
          nonCurrentAssetSales,
          nonCurrentAssetSalesCost,
          otherIncomeTotal,
          otherExpensesTotal,
          equityAccountingResultTotal,
          nonCurrentAssetSalesTotal,
          nonCurrentAssetSalesCostTotal,
          otherIncomeExpensesTotal,
        },
        provisionIRCSLL,
        provisionIRCSLLTotal,
        debenturesEmployeesAdministratorsShares,
        debenturesEmployeesAdministratorsSharesTotal,
      }
    }

    return newData
  }

  return {
    bankAccountMovementIndex: null
  }
}
