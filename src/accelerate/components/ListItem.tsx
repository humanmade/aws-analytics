
import React, { useState } from 'react';
import classNames from 'classnames';
import { __, sprintf } from '@wordpress/i18n';
import { decodeEntities } from '@wordpress/html-entities';
import { Button } from '@wordpress/components';
import moment from 'moment';

import { periods } from '../../data/periods';
import { Duration, Post, HistogramDiffs, compactMetric, getConversionRateLift, trackEvent } from '../../util';

import Image from './Image';
import SparkChart from './SparkChart';
import ImageGroup from './ImageGroup';
import { useSelect } from '@wordpress/data';

const ListItem = function ( props: {
	listId: string,
	item: Post,
	maxViewsPerUrl: number,
	histogramDiffs: HistogramDiffs,
	period?: Duration,
	onManage?: Function,
	isNested?: boolean,
	actions?: {
		[ k: string ]: Function
	},
} ) {
	const {
		listId,
		item: post,
		maxViewsPerUrl,
		histogramDiffs,
		period,
		onManage,
		isNested,
		actions,
	} = props;

	const [ isExpanded, setIsExpanded ] = useState<boolean>( false );

	let lift: number | null = null;
	let change: number | null = null;

	if ( post.lift ) {
		lift = getConversionRateLift( post.lift.fallback, post.lift.personalized );
	}

	if ( histogramDiffs[ post.id ] && histogramDiffs[ post.id ].previous.uniques > 0 ) {
		change = ( ( histogramDiffs[ post.id ].current.uniques - histogramDiffs[ post.id ].previous.uniques ) / histogramDiffs[ post.id ].previous.uniques ) * 100;
	}

	const isNestable = post.type.name === 'broadcast';
	const nested = useSelect( select => select( 'accelerate' ).getPosts<Post[]>( {
		include: post.blocks
	}, false ), [ post.blocks ] );

	const onEdit = ( e: React.MouseEvent ) => {
		trackEvent( listId, 'Action', { action: 'edit', type: post.type } );

		if ( onManage ) {
			e.preventDefault();
			onManage( post );
		}
	}

	return (
		<>
			<tr key={ post.id } className={ classNames( {
				'record-item': true,
				'record-item--nestable': isNestable,
				'record-item--nested': isNested,
				'record-item--empty': isNestable && post.blocks.length === 0,
			}) }>
				{ isNestable && (
					<td className='record-expand'>
						{ isExpanded
							? (
								<Button isTertiary icon={ "arrow-down-alt2" } onClick={ () => setIsExpanded( false ) } title={ __( 'Collapse', 'altis' ) }></Button>
							)
							: (
								<Button isTertiary icon={ "arrow-right-alt2" } onClick={ () => setIsExpanded( true ) } title={ __( 'Expand', 'altis' ) }></Button>
							)
						}
					</td>
				) }
				{ isNested && (
					<td className='record-expand record-expand--nested'></td>
				) }
				<td className='record-thumbnail'>
					<div className='record-thumbnail-wrap'>
						{ isNestable
							? ( post.blocks.length > 0 )
								? (
									<ImageGroup
										blocks={ post.blocks }
										width={ 105 }
										height={ 47 }
									/>
								) : (
									<div
										className='record-thumbnail__empty'
									>
									</div>
								)
							: post.thumbnail
								? (
									<Image
										src={ post.thumbnail }
										alt={ post.title }
										width={ 105 }
										height={ 47 }
									/>
								) : post.editUrl && (
									<div
										className='record-thumbnail__empty'
									>
									</div>
								)
						}
					</div>
				</td>
				<td className="record-name">
					<div className='record-name__meta'>
						<div className='record-name__type'>
							{ decodeEntities( post.type.label ) }
						</div>
						{ post.parent && (
							<div className='record-name__parent'>
								<a href={ post.parent.editUrl }>{ post.parent.title }</a>
							</div>
						) }
						<div className='record-name__date' title={ post.date }>
							{ moment( post.date ).fromNow() }
						</div>
					</div>
					<div className='record-name__title'>
						<a href={ post.url || post.editUrl || '' } onClick={ (e: React.MouseEvent) => {
							trackEvent( listId, 'Navigate', { type: post.type } );
							onManage && onEdit( e );
						} }>
							{ decodeEntities( post.title ) }
						</a>
					</div>
				</td>
				<td className="record-traffic">
					<div>
						<span>
							{ sprintf(
								'%s Views',
								periods.filter( p => p.value === period )[ 0 ].period_label
							) }
							<strong>{ new Intl.NumberFormat().format( post.views ) }</strong>
						</span>
						<SparkChart
							maxViews={ maxViewsPerUrl }
							histogram={ histogramDiffs[ post.id ]?.current.by_date || [] }
							period={ period }
						/>
						<div
							className={ `record-traffic__change score-${ change && change >= 0 ? 'pos' : 'neg' }` }
							title={ __( 'Comparison to previous period', 'altis' ) }
						>
							{ !! change && ! isNaN( change ) && ( change > 0 ? '↑' : '↓' ) }
							{ ' ' }
							{ !! change && ! isNaN( change ) && compactMetric( parseFloat( Math.abs( change ).toFixed( 1 ) ), '%' ) }
						</div>
					</div>
				</td>
				<td className="record-lift">
					<div className="record-lift__label">{ !! lift && __( 'Lift', 'altis' ) }</div>
					<div
						className={ `record-lift__value score-${ lift && lift >= 0 ? 'pos' : 'neg' }` }
						title={ __( 'Aggregated improvement of variants compared to fallback', 'altis' ) }
					>
						{ !! lift && ! isNaN( lift ) && ( lift >= 0 ? '↑' : '↓' ) }
						{ ' ' }
						{ !! lift && ! isNaN( lift ) && compactMetric( parseFloat( Math.abs( lift ).toFixed( 1 ) ), '%' ) }
					</div>
				</td>
				<td className="record-meta">
					<div className='record-meta__author'>
						<img alt="" className="record-meta__author-avatar" src={ post.author.avatar } />
						<span className='record-meta__author-name'>
							{ decodeEntities( post.author.name ) }
						</span>
					</div>
					<div className="record-meta__links">
						{ ! actions && post.editUrl && ( <>
							{ ' ' }
							<a href={ post.editUrl } onClick={ onEdit }>
								{ __( 'Edit', 'altis' ) }
							</a>
						</> ) }
						{ post.url && ( <>
							{ ' ' }
							<a href={ post.url } onClick={ () => trackEvent( listId, 'Action', { action: 'view', type: post.type } ) }>
								{ __( 'View', 'altis' ) }
							</a>
						</> ) }
						{
							actions && Object.keys( actions ).map( label => (
								<a href="https://google.com" onClick={ e => {
									e.preventDefault();
									actions[ label ]( post );
								} }>
									{ label }
								</a>
							) )
						}
					</div>
				</td>
			</tr>
			{ isExpanded && (
				( post.blocks.length > 0 )
					? (
						( nested ? nested.map( nestedBlock => (
							<ListItem
								listId={ listId }
								isNested
								item={ nestedBlock }
								maxViewsPerUrl={ maxViewsPerUrl }
								histogramDiffs={ histogramDiffs }
								period={ period }
							/>
						)
						): (
							<td colSpan={ 7 } className="record-item--nested-loading">
								{ __( 'Loading nested blocks...', 'altis' ) }
							</td>
						))
					) : (
						<tr className="record-item--nested-empty">
							<td colSpan={ 7 }>
								{ __( 'No blocks assigned to this block just yet.', 'altis' ) }
								{ ' ' }
								<a href={ post.editUrl || '' } onClick={ onEdit }>
									{ __( 'Add blocks', 'altis' ) }
								</a>
							</td>
						</tr>
					)
			) }
		</>
	);
}

export default ListItem;