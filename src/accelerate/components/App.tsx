import React from 'react';

import Dashboard from './Dashboard';
import { InitialData } from '../../util';

import './App.css';

interface State {
	user: InitialData['user'],
}

interface Props {
	config: Window['AltisAccelerateDashboardData'],
}

export default class App extends React.Component<Props, State> {
	state: State = {
		user: {
			name: '...',
		},
	};

	constructor( props: Props ) {
		super( props );

		this.state.user = props.config.user;
	}

	render() {
		return (
			<main className="App">
				<Dashboard
					postTypes={ this.props.config.post_types }
					user={ this.state.user }
				/>
			</main>
		);
	}
}
