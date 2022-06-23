import GraphContainer, { GraphRow } from '@axosoft/gitkraken-components/lib/components/graph/GraphContainer';
import * as React from 'react';
// import { TextDocument, Uri, workspace } from 'vscode';

// TODO: remove mockGraphRows constant once we get fixed GITLENS-203
const mockGraphRows: GraphRow[] = [
  {
    sha: '1411222233334447',
    parents: ['1311222233334445'],
    author: 'Miggy Eusebio',
    email: 'miggy.eusebio@gitkraken.com',
    date: 1655065060000,
    message: 'Third commit',
    type: 'commit-node'
  },
  {
    sha: '1311222233334445',
    parents: ['1211222233334444'],
    author: 'Eric Follana',
    email: 'eric.follana@gitkraken.com',
    date: 1654978660000,
    message: 'Second commit',
    type: 'commit-node'
  },
  {
    sha: '1211222233334444',
    parents: [],
    author: 'Ramin Tadayon',
    email: 'ramin.tadayon@gitkraken.com',
    date: 1654892260000,
    message: 'Initial commit',
    type: 'commit-node'
  }
];

interface GKProps {
  extensionUri?: any;
}

interface GKState {
  rows?: GraphRow[];
}

export class GKGraph extends React.Component<GKProps, GKState> {
  /**
   * JIRA task GITLENS-203:
   * Commented those lines because React component LifeCycle is not working properly
   * because we are using "ReactDOMServer.renderToString" instead of "ReactDOM.render"
   * in "gk-webview-panel.tsx" file. Done in that way because this project was an example
   * but this is not the correct way.
   *
   * This need to be fixed as our lib component won't be able to be displayed and work properly.
   *
   * TODO: We need to use "ReactDOM.render" instead. For that, we will need to modify this
   * project to build a new .js (that will do the "ReactDOM.render" call instead) to be
   * included by using an script tag in "gk-webview-panel.tsx".
   *
   */
  constructor(props: GKProps) {
    super(props);

    this.state = {
      rows: []
    };
  }

  override componentDidMount() {
    // const {
    //   // extensionUri
    // } = this.props;

    // Load mocks for testing the Graph

    // const uri: Uri = vscode.Uri.joinPath(props.extensionUri, 'src', 'mocks', 'rows', 'simple-graph-rows-mock.json');
    // const uri: Uri = vscode.Uri.joinPath(props.extensionUri, 'src', 'mocks', 'rows', 'graph-rows-mock-with-WIP.json');
    // if (extensionUri != null) {
    //   const uri: Uri = Uri.joinPath(extensionUri, 'src', 'mocks', 'rows', 'graph-rows-mock.json');
    //   // eslint-disable-next-line @typescript-eslint/no-floating-promises
    //   workspace.openTextDocument(uri).then(
    //     (document: TextDocument) => {
    //       const jsonTxt: string = document.getText();
    //       this.setState({ rows: JSON.parse(jsonTxt) });
    //     }
    //   );
    // }
  }

  override render() {
    // const {
    //   rows
    // } = this.state;
    const rows = mockGraphRows; // TODO: remove this line once we get fixed GITLENS-203

    return (
      <div className="GKGraph">
        <h1>Test "GraphContainer" component</h1>
        <GraphContainer
          graphRows={rows}
          useAuthorInitialsForAvatars={false}
        />
      </div>
    );
  }
}
