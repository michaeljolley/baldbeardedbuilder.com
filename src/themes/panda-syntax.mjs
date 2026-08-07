const pandaSyntax = {
  name: 'Panda Syntax',
  type: 'dark',
  colors: {
    'editor.background': '#292a2b',
    'editor.foreground': '#e6e6e6',
    'editorLineNumber.foreground': '#676b79',
    'editorLineNumber.activeForeground': '#e6e6e6',
    'editor.selectionBackground': '#45a9f933',
    'editor.inactiveSelectionBackground': '#45a9f91a'
  },
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: {
        foreground: '#676b79',
        fontStyle: 'italic'
      }
    },
    {
      scope: ['string', 'constant.other.symbol'],
      settings: {
        foreground: '#19f9d8'
      }
    },
    {
      scope: ['constant.numeric', 'constant.language', 'support.constant'],
      settings: {
        foreground: '#ffb86c'
      }
    },
    {
      scope: ['keyword', 'storage', 'storage.type', 'storage.modifier'],
      settings: {
        foreground: '#ff75b5'
      }
    },
    {
      scope: ['entity.name.function', 'support.function', 'meta.function-call'],
      settings: {
        foreground: '#45a9f9'
      }
    },
    {
      scope: ['entity.name.type', 'entity.name.class', 'support.class', 'support.type'],
      settings: {
        foreground: '#b084eb'
      }
    },
    {
      scope: ['variable', 'variable.other', 'meta.definition.variable.name'],
      settings: {
        foreground: '#e6e6e6'
      }
    },
    {
      scope: ['variable.parameter', 'meta.function.parameters'],
      settings: {
        foreground: '#ffcc95'
      }
    },
    {
      scope: ['entity.name.tag', 'support.class.component'],
      settings: {
        foreground: '#ff75b5'
      }
    },
    {
      scope: ['entity.other.attribute-name', 'support.type.property-name'],
      settings: {
        foreground: '#19f9d8'
      }
    },
    {
      scope: ['keyword.operator', 'punctuation.accessor', 'punctuation.separator'],
      settings: {
        foreground: '#ff75b5'
      }
    },
    {
      scope: ['punctuation', 'meta.brace', 'meta.delimiter'],
      settings: {
        foreground: '#e6e6e6'
      }
    },
    {
      scope: ['markup.heading', 'entity.name.section'],
      settings: {
        foreground: '#45a9f9',
        fontStyle: 'bold'
      }
    },
    {
      scope: ['markup.bold'],
      settings: {
        foreground: '#ffb86c',
        fontStyle: 'bold'
      }
    },
    {
      scope: ['markup.italic'],
      settings: {
        foreground: '#b084eb',
        fontStyle: 'italic'
      }
    },
    {
      scope: ['invalid', 'invalid.illegal'],
      settings: {
        foreground: '#ffffff',
        background: '#ff2c6d'
      }
    }
  ]
};

export default pandaSyntax;
