/* eslint-disable no-unused-expressions */

async ({ data, authorization, endpoint, options }) => {
  let detailedItems = [],
    syntheticItems = []

  const { nfeIndex: { payload } } = data

  if (options?.reportType?.value === 'detailed') {
    //show_input_nfes
    const inputNfesItems = payload
      .filter(item => (
        item._source.operation_type === 'input'
          && ['supplier', 'authorized'].includes(item._source.status)
      ))
      .map(item => {
        const {
          status,
          customs_clearance,
          shipment,
          di,
          number,
          serie_number,
          emission_date,
          updated_at,
          emission_finality,
          customer,
          totals: {
            total,
            freight_international,
            freight,
            insurance,
            ii,
            pis,
            cofins,
            ipi,
            icms,
            other_cost,
            discount,
            product,
          },
          products,
        } = item._source

        return ({
          nfe_status_supplier: status === 'supplier' ? 'Terceiros' : 'Própria', // perguntar para o glaucio
          customs_clearance,
          shipment,
          di,
          number,
          serie_number,
          emission_date: options.moment(emission_date).format('YYYY-MM-DD'), // nfe_status_supplier ? emission_date : nfe_aut_date
          updated_at: options.moment(updated_at).format('YYYY-MM-DD'), // nfe_status_supplier ? updated_at : nfe_aut_date
          emission_finality,
          customer,
          nfe_cost: 81601.23, // perguntar para o glaucio
          amount: product,
          freight_amount: freight_international || freight.total, // perguntar para o glaucio
          insurance_amount: insurance.total,
          ii_amount: ii,
          pis_amount: pis.total,
          cofins_amount: cofins.total,
          ipi_bc_amount: options.sum(products.map(product => product.totals.ipi), 'bc'), // perguntar para o glaucio
          ipi_amount: ipi.total,
          icms_bc_amount: icms.bc,
          icms_amount: icms.total,
          icms_st_amount: icms.st,
          icms_interstate_emitter_total: icms.interstate_emitter,
          icms_interstate_target_total: icms.interstate_target,
          icms_fcp_total: icms.fcp,
          other_cost_amount: other_cost,
          discount_amount: discount.total,
          nfe_amount: total,
        })
      })

    // show_output_nfes
    const outputNfesItems = payload
    .filter(item => (
      item._source.operation_type === 'output'
        && ['supplier', 'authorized'].includes(item._source.status)
    ))
    .map(item => {
      const {
        customs_clearance,
        shipment,
        di,
        number,
        serie_number,
        emission_date,
        emission_finality,
        customer,
        totals: {
          total,
          freight_international,
          freight,
          insurance,
          pis,
          cofins,
          ipi,
          icms,
          other_cost,
          discount,
          product,
        },
        products,
      } = item._source

      return ({
        customs_clearance,
        shipment,
        di,
        number,
        serie_number,
        nfe_aut_date: options.moment(emission_date).format('YYYY-MM-DD'),
        emission_finality,
        customer,
        nfe_cost: 81601.23,
        amount: product,
        freight_amount: freight_international || freight.total, // perguntar para o glaucio
        insurance_amount: insurance.total,
        pis_amount: pis.total,
        cofins_amount: cofins.total,
        ipi_bc_amount: options.sum(products.map(product => product.totals.ipi), 'bc'), // perguntar para o glaucio
        ipi_amount: ipi.total,
        ipi_diff: 0, // perguntar para o glaucio
        icms_bc_amount: icms.bc,
        icms_amount: icms.total,
        icms_st_amount: icms.st,
        icms_interstate_emitter_total: icms.interstate_emitter,
        icms_interstate_target_total: icms.interstate_target,
        icms_fcp_total: icms.fcp,
        other_cost_amount: other_cost,
        discount_amount: discount.total,
        nfe_amount: total,
      })
    })


    // show_canceled_nfes
    const canceledNfesItems = payload
      .filter(item => item._source.status === 'canceled')
      .map(item => {
        const {
          operation_type,
          customs_clearance,
          di,
          number,
          serie_number,
          emission_date,
          emission_finality,
          sefaz: {
            cancel: {
              date: cancel_date,
              message: description,
            }
          }
        } = item._source

        return ({
          operation_type: operation_type === 'input' ? 'Entrada' : 'Saída',
          customs_clearance,
          di,
          number,
          serie_number,
          cancel_date: options.moment(cancel_date).format('MM/YYYY'),
          nfe_aut_date: options.moment(emission_date).format('YYYY-MM-DD'),
          emission_finality,
          description,
        })
      })

     // show_denied_nfes
     const deniedNfesItems = payload
      .filter(item => item._source.status === 'denied')
      .map(item => {
        const {
          operation_type,
          customs_clearance,
          di,
          number,
          serie_number,
          emission_date,
          emission_finality,
          customer
        } = item._source

        return ({
          operation_type: operation_type === 'input' ? 'Entrada' : 'Saída',
          customs_clearance,
          di,
          number,
          serie_number,
          nfe_aut_date: options.moment(emission_date).format('YYYY-MM-DD'),
          emission_finality,
          customer,
        })
      })

    // show_denied_nfes
    const ccesItems = payload
      .filter(item => item._source.sefaz?.cce?.sequence > 1) // somente notas autorizadas/canceladas
      .map(item => {
        const {
          operation_type,
          number,
          key,
          sefaz: {
            cce: {
              date,
              message,
            }
          }
        } = item._source

        return ({
          operation_type: operation_type === 'input' ? 'Entrada' : 'Saída',
          number,
          key,
          date: options.moment(date).format('DD/MM/YYYY'),
          message
        })
      })

    detailedItems = {
      showInputNfes: {
        items: inputNfesItems,
        showUnitCost: {
          show_unit_cost_input: false,
        }, // { show_unit_cost_input: true or false }
        total: {
          nfe_cost: options.sum(inputNfesItems, 'nfe_cost'),
          amount: options.sum(inputNfesItems, 'amount'),
          freight_amount: options.sum(inputNfesItems, 'freight_amount'),
          insurance_amount: options.sum(inputNfesItems, 'insurance_amount'),
          ii_amount: options.sum(inputNfesItems, 'ii_amount'),
          pis_amount: options.sum(inputNfesItems, 'pis_amount'),
          cofins_amount: options.sum(inputNfesItems, 'cofins_amount'),
          ipi_bc_amount: options.sum(inputNfesItems, 'ipi_bc_amount'),
          ipi_amount: options.sum(inputNfesItems, 'ipi_amount'),
          icms_bc_amount: options.sum(inputNfesItems, 'icms_bc_amount'),
          icms_amount: options.sum(inputNfesItems, 'icms_amount'),
          icms_st_amount: options.sum(inputNfesItems, 'icms_st_amount'),
          icms_interstate_emitter_total: options.sum(inputNfesItems, 'icms_interstate_emitter_total'),
          icms_interstate_target_total: options.sum(inputNfesItems, 'icms_interstate_target_total'),
          icms_fcp_total: options.sum(inputNfesItems, 'icms_fcp_total'),
          other_cost_amount: options.sum(inputNfesItems, 'other_cost_amount'),
          discount_amount: options.sum(inputNfesItems, 'discount_amount'),
          nfe_amount: options.sum(inputNfesItems, 'nfe_amount'),
        }
      },
      showOutputNfes: {
        items: outputNfesItems,
        showUnitCost: {
          show_unit_cost_input: true,
        },
        total: {
          nfe_cost: options.sum(outputNfesItems, 'nfe_cost'),
          amount: options.sum(outputNfesItems, 'amount'),
          freight_amount: options.sum(outputNfesItems, 'freight_amount'),
          insurance_amount: options.sum(outputNfesItems, 'insurance_amount'),
          pis_amount: options.sum(outputNfesItems, 'pis_amount'),
          cofins_amount: options.sum(outputNfesItems, 'cofins_amount'),
          ipi_bc_amount: options.sum(outputNfesItems, 'ipi_bc_amount'),
          ipi_amount: options.sum(outputNfesItems, 'ipi_amount'),
          ipi_diff: options.sum(outputNfesItems, 'ipi_diff'),
          icms_bc_amount: options.sum(outputNfesItems, 'icms_bc_amount'),
          icms_amount: options.sum(outputNfesItems, 'icms_amount'),
          icms_st_amount: options.sum(outputNfesItems, 'icms_st_amount'),
          icms_interstate_emitter_total: options.sum(outputNfesItems, 'icms_interstate_emitter_total'),
          icms_interstate_target_total: options.sum(outputNfesItems, 'icms_interstate_target_total'),
          icms_fcp_total: options.sum(outputNfesItems, 'icms_fcp_total'),
          other_cost_amount: options.sum(outputNfesItems, 'other_cost_amount'),
          discount_amount: options.sum(outputNfesItems, 'discount_amount'),
          nfe_amount: options.sum(outputNfesItems, 'nfe_amount'),
        }
      },
      showCanceledNfes: {
        items: canceledNfesItems,
      },
      showDeniedNfes: {
        items: deniedNfesItems,
      },
      showNfeDisableRanges: null, // não está indexado
      showCces: {
        items: ccesItems,
      },
    }
  } else {
    syntheticItems = payload.map(item => ({
      ...item._source,
      emission_date: options.moment(item._source.emission_date).format('YYYY-MM-DD'),
      operation_type: item._source.operation_type === 'input'
        ? 'Entrada' : 'Saída',
      products_total_amount: options.sum(item._source.products, 'total'),
      products_total_quantity: options.sum(item._source.products, 'quantity_sale'),
      products_cfop: item._source.products.map(obj => obj.cfop)[0],
    }))
  }

  const newData = {
    nfeIndex: {
      detailedItems,
      syntheticItems,
    },
  }

	return newData
}
