export const mustacheMethods = {
  cnpjFormatter: () => {
    return (text, render) => {
      if (render(text).length === 14) {
        return render(text).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      }

      if (render(text).length === 11) {
        return render(text).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      }

      return render(text)
    }
  },
  dateFormatter: () => {
    return (text, render) => {
      if (!render(text)) return null
      const split = render(text).split('-')

      return `${split[2]}/${split[1]}/${split[0]}`
    }
  },
  valueFormatter: () => (text, render) => Number(render(text))?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', ''),
  getFullDate: () => () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    const today = new Date()

    return `${today.toLocaleDateString('pt-BR', options)} as ${today.toLocaleTimeString('pt-BR')}`
  },
  yesOrNot: () => (text, render) => (render(text) === 'true' ? 'Sim' : 'Não'),
  upperFirst: () => (text, render) => render(text).trim()
    .charAt(0).toUpperCase() + render(text).trim().slice(1),
    statusBadge: () => (text, render) => {
      const status = {
        waiting_review: 'yellow',
        partially_paid: 'clearly-green',
        paid: 'green',
        conciliated: 'blue',
        generating_conciliation: 'light-blue',
        open: 'green',
        overdue: 'red',
      }
  
      return status[render(text)] || 'gray'
    },
  
    // retorna a tradução do status {{#statusTranslate}}{{value}}{{/statusTranslate}}
    statusTranslate: () => (text, render) => {
      const status = {
        waiting_review: 'Aguardando revisão',
        partially_paid: 'Pago parcialmente',
        paid: 'Pago',
        conciliated: 'Conciliado',
        generating_conciliation: 'Gerando conciliação',
        open: 'Aberto',
        overdue: 'Vencido',
      }
  
      return status[render(text)] || 'Outros'
    },
  documentTypeTranslate: () => (text, render) => {
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

    return types[render(text)]
  },
  launchTypeTranslate: () => (text, render) => {
    const types = {
      normal: 'Normal',
      recurrent: 'Recorrente',
      parceled: 'Parcelado',
      initial_balance: 'Balanço inicial',
      invoice: 'Nf-e',
      adjust_balance: 'Ajuste de saldo',
    }

    return types[render(text)]
  },

  // retorna a tradução do tipo da entidade {{#entityTypeTranslate}}{{value}}{{/entityTypeTranslate}}
  entityTypeTranslate: () => (text, render) => {
    const types = {
      exterior: 'Exterior',
      individual: 'Física',
      legal_entity: 'Jurídica',
    }

    return types[render(text)]
  },
}
