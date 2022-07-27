import React, { useState } from 'react';
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { __experimentalRadioGroup as RadioGroup, __experimentalRadio as Radio, Icon } from '@wordpress/components';
import { Pagination } from 'react-pagination-bar';
import ContentLoader from "react-content-loader"

import { Dropdown, Button, MenuGroup, MenuItem } from '@wordpress/components';

import { periods } from '../../data/periods';
import { compactMetric, Duration, getConversionRateLift, InitialData, Post, State, trackEvent } from '../../util';

import './Dashboard.scss';
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
			label: __( 'Me', 'altis' ),
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
					<div className="table-filter table-filter__period">
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
						<span className="dashicons dashicons-search"></span>
						<input
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
					</div>
					<div className="table-add-new">
						<Dropdown
							className=""
							contentClassName=""
							position="bottom right"
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
											{ type.singular_label }
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
										<rect x={0} y={10} rx="5" ry="5" width={75} height={6} />
										<rect x={0} y={30} rx="5" ry="5" width={75} height={6} />

										<rect x={100} y={20} rx="2" ry="2" width={10} height={35} />
										<rect x={120} y={30} rx="2" ry="2" width={10} height={25} />
										<rect x={140} y={20} rx="2" ry="2" width={10} height={35} />
										<rect x={160} y={40} rx="2" ry="2" width={10} height={15} />
										<rect x={180} y={20} rx="2" ry="2" width={10} height={35} />
										<rect x={200} y={40} rx="2" ry="2" width={10} height={10} />
										<rect x={220} y={45} rx="2" ry="2" width={10} height={5} />
									</ContentLoader>
								</td>
								<td className="record-lift">&nbsp;</td>
								<td className="record-meta">
									<ContentLoader
										{ ...loaderProps }
										height={ 50 }
									>
										<circle cx={ 12 } cy={12} r="12" />
										<rect x={0} y={40} rx="5" ry="5" width={120} height={6} />
										<rect x={40} y={12} rx="5" ry="5" width={70} height={6} />
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

							if ( post.lift ) {
								lift = getConversionRateLift( post.lift.fallback, post.lift.personalized );
							}

							return (
								<tr key={ post.id }>
									<td className='record-thumbnail'>
										{ post.thumbnail && (
											<img src={ post.thumbnail } alt={ post.title }/>
										) }
										{ post.thumbnail === '' && post.editUrl && (
											<Button
												href={ post.editUrl }
												isLink
												title={ __( 'Set featured image', 'altis' ) }
												onClick={ () => trackEvent( 'Content Explorer', 'Set Feature Image', { type: post.type } ) }
											>
												<Icon icon="plus-alt" />
												<span className="screen-reader-text">{ __( 'Set featured image' ) }</span>
											</Button>
										) }
									</td>
									<td className="record-name">
										<div className='record-name__type'>
											{ post.type.label }
										</div>
										<div className='record-name__tag'></div>
										<div className='record-name__title'>
											<a href={ post.url || post.editUrl || '' } onClick={ () => trackEvent( 'Content Explorer', 'Navigate', { type: post.type } ) }>
												{ post.title }
											</a>
										</div>
									</td>
									<td className="record-traffic">
										<div>
											<span>
												{ sprintf(
													'%s Views',
													periods.filter( p => p.value === period )[ 0 ].label
												) }
												<strong>{ new Intl.NumberFormat().format( post.views ) }</strong>
											</span>
											<SparkChart
												histogram={ post?.histogram || [] }
											/>
										</div>
									</td>
									<td className={ `record-lift score-${ lift && lift >= 0 ? 'pos' : 'neg' }` }>
										{ !! lift && ! isNaN( lift ) && ( lift >= 0 ? '↑' : '↓' ) }
										{ !! lift && ! isNaN( lift ) && compactMetric( parseFloat( lift.toFixed( 1 ) ), '%' ) }
									</td>
									<td className="record-meta">
										<div className='record-meta__author'>
											<img alt="" className="record-meta__author-avatar" src={ post.author.avatar } />
											<span className='record-meta__author-name'>
												{ post.author.name }
											</span>
										</div>
										<div className="record-meta__links">
											{ post.editUrl && ( <>
												{ ' ' }
												<a href={ post.editUrl } onClick={ () => trackEvent( 'Content Explorer', 'Action', { action: 'edit', type: post.type } ) }>
													{ __( 'Edit', 'altis' ) }
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
