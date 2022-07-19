import React, { useState } from 'react';

import Header from './Header';
import Welcome from './Welcome';
import HeroChart from './HeroChart';
import List from './List';
import { Duration, InitialData } from '../../util';

import './Dashboard.scss';

interface Props {
	postTypes: InitialData['postTypes'],
	user: InitialData[ 'user' ],
	version: InitialData['version'],
}

export default function Dashboard( props: Props ) {
	const [ period, setPeriod ] = useState<Duration>( 'P7D' );

	return (
		<div className="Dashboard">
			<Header
				version={ props.version }
			/>
			<Welcome
				user={ props.user }
			/>
			<HeroChart
				period={ period }
			/>
			<List
				period={ period }
				postTypes={ props.postTypes }
				user={ props.user }
				onSetPeriod={ setPeriod }
			/>
		</div>
	)
}
