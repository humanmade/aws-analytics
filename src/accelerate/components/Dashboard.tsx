import React, { useState } from 'react';

import HeroChart from './HeroChart';
import Header from './Header';
import List from './List';
import { Duration, InitialData } from '../../util';

import './Dashboard.scss';

interface Props {
	postTypes: InitialData['postTypes'],
	tracking: InitialData['tracking'],
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
