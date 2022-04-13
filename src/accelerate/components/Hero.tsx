import React from 'react';
import { __, sprintf } from '@wordpress/i18n';

import { periods } from '../../data/periods';
import { Duration } from '../../util';

import './Dashboard.scss';

type Props = {
	name: string,
	period?: Duration,
	onSetPeriod?: ( value: Duration ) => void,
};

export default function Hero( props: Props ) {
	return (
		<div className="Hero">
			<div className="Hero__content">
				<h1>{ sprintf( __( 'Hello %s', 'altis' ), props.name ) }</h1>
				<h2>{ __( 'Welcome to the future', 'altis' ) } <span role="img" aria-label="letsgo">✨</span></h2>
				<div className="Hero__tools">
					<div className="Hero__timeranges">
						{ !! props.period && periods.map( p => {
							const classes = [ 'timerange' ];
							if ( p.value === props.period ) {
								classes.push( 'timerange-active' );
							}
							return (
								<button
									key={ p.value }
									className={ classes.join( ' ' ) }
									type="button"
									onClick={ () => {
										props.onSetPeriod && props.onSetPeriod( p.value )
									} }
								>
									{ p.label }
								</button>
							);
						} ) }
					</div>
					{ !! props.period && (
						<nav className='Hero__links'>
							<a href="index.php?page=altis-analytics">{ __( 'Analytics', 'altis-analytics' ) }</a>
							<a href="edit.php?post_type=xb">{ __( 'Insights', 'altis-analytics' ) }</a>
						</nav>
					) }
				</div>
			</div>
		</div>
	)
}