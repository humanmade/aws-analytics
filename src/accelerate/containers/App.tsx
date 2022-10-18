import React from 'react';

import Dashboard from '../content-explorer/Dashboard';
import BroadcastManager from '../broadcast-manager';
import { InitialData } from '../../util';

import './App.scss';
import Header from '../components/Header';

interface State {
	user: InitialData[ 'user' ],
	page: string,
}

interface Props {
	config: Window['AltisAccelerateDashboardData'],
}

export default class App extends React.Component<Props, State> {
	state: State = {
		user: {
			name: '...',
		},
		page: ''
	};

	constructor( props: Props ) {
		super( props );

		this.state.user = props.config.user;
		this.state.page = props.config.page;
	}

	render() {
		return (
			<main className="App">
				<Header
					version={ this.props.config.version }
				/>
				{ this.props.config.page === 'dashboard' && (
					<Dashboard
						postTypes={ this.props.config.post_types }
						user={ this.state.user }
					/>
				) }
				{ this.props.config.page === 'broadcast' && (
					<BroadcastManager
						postTypes={ this.props.config.post_types }
						user={ this.state.user }
						id={ this.props.config.id ?? 0 }
					/>
				) }
			</main>
		);
	}
}
