import React from 'react';
import { __, sprintf } from '@wordpress/i18n';

import { periods } from '../../data/periods';
import { Duration } from '../../util';

import './Dashboard.scss';

type Props = {
	name: string,
	period?: Duration,
	canViewAnalytics: boolean,
	canViewInsights: boolean,
	onSetPeriod?: ( value: Duration ) => void,
};

export default function Hero( props: Props ) {
	return (
		<div className="Hero">
			<div className="Hero__content">
				<h1>{ sprintf( __( 'Hello %s', 'altis' ), props.name ) }</h1>
				<h2>{ __( 'Welcome to the future', 'altis' ) } <span role="img" aria-label="letsgo">✨</span></h2>

			</div>
		</div>
	)
}
