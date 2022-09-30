import React, { useState } from 'react';
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { __experimentalRadioGroup as RadioGroup, __experimentalRadio as Radio } from '@wordpress/components';
import { decodeEntities } from '@wordpress/html-entities';
import moment from 'moment';
import { Pagination } from 'react-pagination-bar';
import ContentLoader from 'react-content-loader';

import { Dropdown, Button, MenuGroup, MenuItem } from '@wordpress/components';

import { periods } from '../../data/periods';
import { compactMetric, Duration, getConversionRateLift, InitialData, Post, State, trackEvent, StatsResult } from '../../util';

import './Dashboard.scss';
import Image from './Image';
import SparkChart from './SparkChart';

let timer: ReturnType<typeof setTimeout> | undefined;

let loaderProps = {
	speed: 2,
	foregroundColor: "#f5f6f8",
	backgroundColor: "#fff"
};

type Props = {
	postTypes: InitialData['postTypes'],
	user: InitialData['user'],
	period?: Duration,
	onSetPeriod: React.Dispatch<React.SetStateAction<Duration>>,
};

export default function List ( props: Props ) {
	const {
		period,
		user: userData,
		onSetPeriod,
	} = props;

	// Filters.
	const [ customFilter, setCustomFilter ] = useState<string>( 'all' );
	const [ search, setSearch ] = useState<string>( '' );
	const [ type, setType ] = useState<string | null>( null );
	const [ user, setUser ] = useState<number | null>( null );
	const [ page, setPage ] = useState<number>( 1 );

	const query = useSelect( select => {
		return {
			posts: select( 'accelerate' ).getPosts<Post[]>( {
				period,
				search,
				type,
				user,
				page,
			} ),
			pagination: select( 'accelerate' ).getPagination<State['pagination']>(),
			isLoading: select( 'accelerate' ).getIsLoading<boolean>(),
		};
	}, [ search, page, type, user, period ] );

	const currentPeriod = periods.find( p => p.value === period ) || periods[0];
	const maxViewsPerUrl = useSelect<number>( select => {
		const stats: StatsResult = select( 'accelerate' ).getStats( {
			period: currentPeriod.value,
			interval: currentPeriod.intervals[0].interval,
		} );
		return Math.max( 0, ...Object.values( stats?.stats.by_url || {} ) );
	}, [ currentPeriod ] );

	const customFilters = [
		{
			value: 'all',
			label: __( 'All', 'altis' ),
		},
		{
			value: 'blocks',
			label: __( 'Blocks', 'altis' ),
		},
		{
			value: 'me',
			label: __( 'My Content', 'altis' ),
		},
	];

	function switchCustomFilter ( filter: string ) {
		setPage( 1 );
		setCustomFilter( filter );
		if ( filter === 'all' ) {
			setType( null );
			setUser( null );
		} else if ( filter === 'blocks' ) {
			setType( 'wp_block,xb' );
			setUser( null );
		} else if ( filter === 'me' ) {
			setType( null );
			setUser( userData.id || 1 );
		}
	}

	function onAddNew( type: string ) {
		trackEvent( 'Content Explorer', 'Add New', { type } );
		return () => {
			window.location.href = '/wp-admin/post-new.php?post_type=' + type;
		};
	}

	const createableTypes = props.postTypes.filter( type => type.name !== 'xb' );

	const { posts, pagination, isLoading } = query;

	const histogramDiffs = useSelect( select => {
		const postIds = posts.map( p => p.id );
		if ( postIds.length === 0 ) {
			return {};
		}
		return select( 'accelerate' ).getDiffs<State['diffs'][ Duration ]>( {
			ids: postIds,
			period,
		} );
	}, [ posts, period ] );

	return (
		<div className="List">
			<div className="table-wrap">
				<form
					className="table-controls"
					method="POST"
					onSubmit={ e => {
						e.preventDefault();
					} }
				>
					<div className="table-filter table-filter__period radio-group">
						<RadioGroup
							label='Period'
							checked={ period }
							onChange={ ( value: Duration ) => {
								trackEvent( 'Content Explorer', 'Period', { type: value } );
								onSetPeriod( value );
							} }
						>
							{ periods.map( p => (
								<Radio
									checked={ p.value === period }
									key={ p.value }
									value={ p.value }
								>
									{ p.label.match( /\d+/ ) }
								</Radio>
							) ) }
						</RadioGroup>
					</div>
					<div className="table-filter table-filter__custom" >
						<RadioGroup
							label='Filter'
							checked={ customFilter }
							onChange={ ( value: string ) => {
								trackEvent( 'Content Explorer', 'Filter', { type: value } );
								switchCustomFilter( value )
							} }
						>
							{ customFilters.map( filter => (
								<Radio
									checked={ filter.value === customFilter }
									key={ filter.value }
									value={ filter.value }
								>
									{ filter.label }
								</Radio>
							) ) }
						</RadioGroup>
					</div>
					<div className="table-search">
						<label htmlFor="accelerate-search">
							<span className="dashicons dashicons-search"></span>
							<input
								id="accelerate-search"
								type="text"
								placeholder={ __( 'Search Pages, Posts & Blocks', 'altis' ) }
								className="search"
								onChange={ e => {
									timer && clearTimeout( timer );
									timer = setTimeout( value => {
										trackEvent( 'Content Explorer', 'Search' );
										setSearch( value );
									}, 500, e.target.value );
								} }
							/>
						</label>
					</div>
					<div className="table-add-new">
						<Dropdown
							className=""
							contentClassName=""
							position="bottom center"
							renderToggle={ ( { isOpen, onToggle } ) => (
								<Button
									isPrimary
									onClick={ onToggle }
									aria-expanded={ isOpen }
									className='dashicons-before dashicons-plus'
								>
									{ __( 'Add New', 'altis' ) }
								</Button>
							) }
							renderContent={ () => (
								<MenuGroup>
									{ createableTypes.map( type => (
										<MenuItem onClick={ onAddNew( type.name ) }>
											{ decodeEntities( type.singular_label ) }
										</MenuItem>
									) ) }
								</MenuGroup>
							) }
						/>
					</div>
				</form>
				<div className="table-content">
					<table aria-live="polite">
						<tbody>
						{ isLoading && [...Array(8)].map( ( _, i ) => (
							<tr key={ `placeholder-${ i }` }>
								<td className="record-thumbnail">
									<ContentLoader
										{ ...loaderProps }
										width={ 105 }
										height={ 47 }
									>
										<rect x={0} y={0} rx="5" ry="5" width={105} height={47} />
									</ContentLoader>
								</td>
								<td className="record-name">
									<ContentLoader
										{ ...loaderProps }
										height={46}
									>
										<rect x={0} y={10} rx="5" ry="5" width={50} height={6} />
										<rect x={0} y={30} rx="5" ry="5" width={100} height={6} />
									</ContentLoader>
								</td>
								<td className="record-traffic">
									<ContentLoader
										{ ...loaderProps }
										height={ 46 }
									>
										<rect x={0} y={10} rx="5" ry="5" width={68} height={6} />
										<rect x={0} y={30} rx="5" ry="5" width={68} height={6} />

										<rect x={83} y={20} rx="2" ry="2" width={11} height={15} />
										<rect x={97} y={30} rx="2" ry="2" width={11} height={5} />
										<rect x={111} y={20} rx="2" ry="2" width={11} height={15} />
										<rect x={125} y={30} rx="2" ry="2" width={11} height={5} />
										<rect x={139} y={20} rx="2" ry="2" width={11} height={15} />
										<rect x={153} y={25} rx="2" ry="2" width={11} height={10} />
										<rect x={167} y={30} rx="2" ry="2" width={11} height={5} />
									</ContentLoader>
								</td>
								<td className="record-lift">&nbsp;</td>
								<td className="record-meta">
									<ContentLoader
										{ ...loaderProps }
										height={ 50 }
									>
										<circle cx={ 12 } cy={12} r="12" />
										<rect x={30} y={30} rx="5" ry="5" width={120} height={6} />
										<rect x={30} y={10} rx="5" ry="5" width={70} height={6} />
									</ContentLoader>
								</td>
							</tr>
						) ) }
						{ ! isLoading && posts.length === 0 && (
							<tr>
								<td className="record-empty" colSpan={ 5 }>
									{ __( 'No content found...', 'altis' ) }
								</td>
							</tr>
						) }
						{ posts.length > 0 && posts.map( post => {
							let lift: number | null = null;
							let change: number | null = null;

							if ( post.lift ) {
								lift = getConversionRateLift( post.lift.fallback, post.lift.personalized );
							}

							if ( histogramDiffs[ post.id ] && histogramDiffs[ post.id ].previous.uniques > 0 ) {
								change = ( ( histogramDiffs[ post.id ].current.uniques - histogramDiffs[ post.id ].previous.uniques ) / histogramDiffs[ post.id ].previous.uniques ) * 100;
							}

							return (
								<tr key={ post.id }>
									<td className='record-thumbnail'>
										<div className='record-thumbnail-wrap'>
										{ post.thumbnail && (
											<Image
												src={ post.thumbnail }
												alt={ post.title }
												width={ 105 }
												height={ 47 }
											/>
										) }
										{ post.thumbnail === '' && post.editUrl && (
											<div
												className='record-thumbnail__empty'
											>
											</div>
										) }
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
											<a href={ post.url || post.editUrl || '' } onClick={ () => trackEvent( 'Content Explorer', 'Navigate', { type: post.type } ) }>
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
											{ post.editUrl && ( <>
												{ ' ' }
												<a href={ post.editUrl } onClick={ () => trackEvent( 'Content Explorer', 'Action', { action: 'edit', type: post.type } ) }>
													{ __( 'Edit', 'altis' ) }
												</a>
											</> ) }
											{ post.url && ( <>
												{ ' ' }
												<a href={ post.url } onClick={ () => trackEvent( 'Content Explorer', 'Action', { action: 'view', type: post.type } ) }>
													{ __( 'View', 'altis' ) }
												</a>
											</> ) }
										</div>
									</td>
								</tr>
							);
						} ) }
						</tbody>
					</table>
					{ pagination.total > 0 && (
						<div className="table-footer">
							<div className="pagination">
								<Pagination
									initialPage={ 1 }
									itemsPerPage={ 25 }
									onPageСhange={ pageNumber => setPage( pageNumber ) }
									totalItems={ pagination.total }
									pageNeighbours={ 10 }
								/>
								<span className="current-page">{ sprintf( __( 'Page %d of %d ', 'altis' ), page, pagination.pages ) }</span>
							</div>
						</div>
					) }
				</div>
			</div>
		</div>
	)
}
