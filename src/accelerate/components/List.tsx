import React, { useState } from 'react';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

import { compactMetric, Duration, getConversionRateLift, InitialData, Post, State } from '../../util';

import './Dashboard.scss';

let timer: ReturnType<typeof setTimeout> | undefined;

type Props = {
	period: Duration,
	postTypes: InitialData['postTypes'],
	user: InitialData['user'],
};

export default function List( props: Props ) {
	// Filters.
	const [ search, setSearch ] = useState<string>( '' );
	const [ page, setPage ] = useState<number>( 1 );
	const [ type, setType ] = useState<string|null>( null );
	const [ user, setUser ] = useState<number|null>( null );

	const query = useSelect( select => {
		return {
			posts: select( 'altis/analytics' ).getPosts<Post[]>( {
				period: props.period || 'P7D',
				search,
				type,
				user,
				page,
			} ),
			pagination: select( 'altis/analytics' ).getPagination<State['pagination']>(),
			isLoading: select( 'altis/analytics' ).getIsLoading<boolean>(),
		};
	}, [ search, page, type, user, props.period ] );

	const { posts, pagination, isLoading } = query;

	const maxViews = posts.reduce( ( carry, post ) => Math.max( post.views, carry ), 0 );

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
					<div className="table-filter">
						<select
							className="filter filter-active"
							onChange={ e => {
								setPage( 1 );
								setType( e.target.value );
							} }
						>
							<option value="">{ __( 'All Content ▾', 'altis' ) }</option>
							{ props.postTypes.map( postType => (
								<option
									selected={ postType.name === type }
									value={ postType.name }
								>
									{ postType.label }
								</option>
							) ) }
						</select>
						<select
							className="filter filter-active"
							onChange={ e => {
								setPage( 1 );
								setUser( parseInt( e.target.value, 10 ) );
							} }
						>
							<option value="">{ __( 'All Authors ▾', 'altis' ) }</option>
							<option
								selected={ user === props.user.id }
								value={ props.user.id }
							>
								{ __( 'My Content', 'altis' ) }
							</option>
						</select>
					</div>
					<div className="table-search">
						<input
							type="text"
							placeholder="Search Pages, Posts & Blocks"
							className="search"
							onChange={ e => {
								timer && clearTimeout( timer );
								timer = setTimeout( value => {
									setSearch( value );
								}, 500, e.target.value );
							} }
						/>
					</div>
				</form>
				<div className="table-content dashboard-shadow">
					<table aria-live="polite">
						<tr className="record-header">
							<th>{ __( 'Views', 'altis' ) }</th>
							<th>{ __( 'Name', 'altis' ) }</th>
							<th>{ __( 'Lift', 'altis' ) }</th>
							<th className="table-th-author">{ __( 'Author', 'altis' ) }</th>
							<th className="table-th-links">{ __( 'Links', 'altis' ) }</th>
						</tr>
						{ isLoading && (
							<tr>
								<td className="record-loading" colSpan={ 5 }>
									{ __( 'Loading...', 'altis' ) }
								</td>
							</tr>
						) }
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
									<td className="record-traffic">
										<div className="traffic-bar" style={ { right: `${ 100 - ( post.views / maxViews * 100 ) }%` } }></div>{ compactMetric( post.views ) }
									</td>
									<td className="record-name">
										{ post.title }
										{ ( post.type.name === 'xb' || post.type.name === 'wp_block' ) && (
											<span className="tag">{ post.type.label }</span>
										) }
									</td>
									<td className={ `record-lift score-${ lift && lift >= 0 ? 'pos' : 'neg' }` }>
										{ !! lift && ! isNaN( lift ) && ( lift >= 0 ? '↑' : '↓' ) }
										{ !! lift && ! isNaN( lift ) && compactMetric( parseFloat( lift.toFixed( 1 ) ) ) }
									</td>
									<td className="record-author">
										<img alt="" className="record-avatar" src={ post.author.avatar } />
										{ post.author.name }
									</td>
									<td className="record-links">
										{ post.url && ( <a href={ post.url }>{ __( 'View', 'altis' ) }</a> ) }
										{ post.editUrl && ( <>{ ' ' }<a href={ post.editUrl }>{ __( 'Edit', 'altis' ) }</a></> ) }
									</td>
								</tr>
							);
						} ) }
					</table>
					<div className="table-footer">
						<div className="pagination">
							<button
								disabled={ page < 2 }
								type="button"
								onClick={ () => setPage( page - 1 ) }
							>
								← { __( 'Prev', 'altis' ) }
							</button>
							{ Array( pagination.pages ).fill( null ).map( ( _, p ) => {
								if ( p + 1 === page ) {
									return ( <div className="current">{ p + 1 }</div> );
								}
								return (
									<button
										type="button"
										onClick={ () => setPage( p + 1 ) }
									>
										{ p + 1 }
									</button>
								);
							} ) }
							<button
								disabled={ page <= pagination.pages }
								type="button"
								onClick={ () => setPage( page + 1 ) }
							>
								{ __( 'Next', 'altis' ) } →
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
