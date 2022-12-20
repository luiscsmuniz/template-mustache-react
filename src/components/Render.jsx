import { useState, useEffect } from 'react'
import ReactMustache from 'react-mustache'
import Frame from 'react-frame-component/'
import CodeMirror from '@uiw/react-codemirror'
import 'codemirror/keymap/sublime'
import 'codemirror/theme/monokai.css'
import { sublime } from '@uiw/codemirror-theme-sublime'
import { html } from '@codemirror/lang-html'
import { tokenData } from './data'
import { mustacheMethods } from './mustacheMethods'
import helper from './helper'

// SETAR VALORES

const authorization = 'jwt-token'
const endpoint = 'https://gateway-sandbox.worksmarter.com.br/graphql'
const valueId = 35922

export const Render = () => {
  const [value, onChange] = useState('')
  const [input, inputOnchange] = useState(valueId)
  const [render, renderOnChange] = useState('')
  const [templateData, setData] = useState(null)

  const getTemplate = async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          {
            showTemplate(where: {
              id: {
                eq: 53
              }
            }) {
              payload {
                id
                code
                query
                settings
              }
            }
          }
        `,
        variables: {},
      })
    })

    const { data: { showTemplate: { payload } } } = await response.json()

    const { code } = payload[0]

    onChange(code)
    renderOnChange(code)
  }

  const getQuery = async (id) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
        {
          financialLaunchIndex(query: {match: {id: ${id} }}) {
            payload
            errors {
              messages
            }
          }
        }
      ` })
    })

    const { data } = await response.json()
    // eslint-disable-next-line no-eval
    const executeHelper = eval(helper)

    const getHelperData = await executeHelper({ data, authorization, endpoint: endpoint })

    setData(getHelperData)
  }

  useEffect(() => {
    const execute = async () => {
      await getTemplate()
      await getQuery(input)
    }
    execute()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!templateData) return null

  return (
    <div className="row">
      <div className="col-6" style={{ fontSize: '10px' }}>
        <Editor value={value} onChange={onChange} />
        <input value={input} onChange={(e) => inputOnchange(e.target.value)} />
        <button
          className="btn btn-info"
          onClick={async () => {
            await getQuery(input)
          }}
        >
          Executar
        </button>

        <button
          className="btn btn-info ml-2"
          onClick={async () => {
            await getTemplate()
          }}
        >
          Reload
        </button>
      </div>
      <div className="col-6">
        <Frame
          width="100%"
          height="900px"
          style={{
            border: 'none',
            borderRadius: '5px',
            overflow: 'auto',
            backgroundColor: '#fff',
          }}
        >
          <ReactMustache template={render} data={{ ...templateData, ...mustacheMethods, ...tokenData }} />

        </Frame>

        <button
          className="btn btn-success"
          onClick={() => renderOnChange(value)}
        >
          Render
        </button>
      </div>
    </div>
  )
}

const Editor = ({ value, onChange }) => (
  <CodeMirror
    value={value}
    onChange={onChange}
    theme={sublime}
    extensions={[html()]}
    height="900px"
    options={{
      theme: 'monokai',
      lineNumbers: true,
      tabSize: 2,
      indentWithTabs: true,
      mode: 'text/html',
      smartIndent: true,
    }}
  />
)