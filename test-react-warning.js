const React = require('react');
const ReactDOM = require('react-dom/server');

function Test() {
  const [val, setVal] = React.useState(0);
  setVal(1);
  return React.createElement('div', null, val);
}

try {
  ReactDOM.renderToString(React.createElement(Test));
} catch (e) {
  console.log(e.message);
}
