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

	/**
	 * Set default value for CSS color variable on mount.
	 *
	 * The values set by `wp_admin_css_color()` are not in a predictable order or strictly used in the CSS.
	 */
	componentDidMount() {
		const root = document.documentElement;

		if ( root.style.getPropertyValue( '--wp-admin-theme-color' ) === '' ) {
			const color = getComputedStyle( document.body.appendChild( document.createElement( 'a' ) ) ).color;
			root.style.setProperty( '--wp-admin-theme-color', color );
		}
	}

	render() {
		return (
			<main className="App">
				<Dashboard
					postTypes={ this.props.config.post_types }
					user={ this.state.user }
					version={ this.props.config.version }
				/>
			</main>
		);
	}
}
