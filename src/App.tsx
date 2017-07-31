import * as React from 'react';
import './ReactCrop.css';
import './App.css';

import ImageEditor from './ImageEditor';

class App extends React.Component<{}, {}> {
  render() {
    return (
      <div className="App">
        <ImageEditor />
      </div>
    );
  }
}

export default App;
