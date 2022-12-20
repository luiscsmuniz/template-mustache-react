export const mustacheMethods = {
  cpnjFormatter: () => {
    return (text, render) => {
      return render(text).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
  },
  dateFormatter: () => {
    return (text, render) => {
      if (!render(text)) return null
      const split = render(text).split('-')

      return `${split[2]}/${split[1]}/${split[0]}`
    }
  },
  valueFormatter: () => {
    return (text, render) => {
      return Number(render(text)).toFixed(2).replace('.', ',')
    }
  },
  getFullDate: () => () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    const today = new Date()

    return today.toLocaleDateString('pt-BR', options)
  },
  yesOrNot: () => (text, render) => (render(text) === 'true' ? 'Sim' : 'Não'),
  upperFirst: () => (text, render) => render(text).trim()
    .charAt(0).toUpperCase() + render(text).trim().slice(1),
}
