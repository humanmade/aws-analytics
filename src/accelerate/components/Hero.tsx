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
										props.onSetPeriod && props.onSetPeriod( p.value );
										analytics.track(
											'filter',
											{
												location: 'dashboard',
												filter_type: 'date_range',
												filter_value: p.label.replace( / /g, '_' ),
											}
										);
									} }
								>
									{ p.label }
								</button>
							);
						} ) }
					</div>
					{ !! props.period && ( props.canViewAnalytics || props.canViewInsights ) && (
						<nav className='Hero__links'>
							{ props.canViewAnalytics && (
								<a
									href="index.php?page=altis-analytics"
									onClick={ () => {
										analytics.track(
											'click',
											{
												location: 'dashboard',
												url: 'index.php?page=altis-analytics',
												link_text: 'Analytics',
											}
										);
									}}
								>
									{ __( 'Analytics', 'altis-analytics' ) }
								</a>
							)}
							{ props.canViewInsights && (
								<a
									href="edit.php?post_type=xb"
									onClick={ () => {
										analytics.track(
											'click',
											{
												location: 'dashboard',
												url: 'edit.php?post_type=xb',
												link_text: 'Insights',
											}
										);
									} }
								>
									{ __( 'Insights', 'altis-analytics' ) }
								</a>
							)}

						</nav>
					) }
				</div>
			</div>
		</div>
	)
}
