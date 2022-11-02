import React, { useState } from 'react';
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { Pagination } from 'react-pagination-bar';

import { periods } from '../../data/periods';
import { Duration, InitialData, Post, State, StatsResult, CustomFilters, HistogramDiffs, PostType } from '../../util';

import './List.scss';
import ListItemPlaceholder from './ListItemPlaceholder';
import ListFilters from './ListFilters';
import ListItem from './ListItem';

type Props = {
	listId: string,
	searchPlaceholder: string,
	postTypes: InitialData[ 'postTypes' ],
	postType?: PostType,
	currentUser: InitialData[ 'user' ],
	period: Duration,
	setPeriod: React.Dispatch<React.SetStateAction<Duration>>,
	filters: string[],
	onAddNewItem?: Function,
	onManageItem?: Function,
	actions?: {
		[ k: string ]: Function
	},
	postId?: number | null,
};

export default function List ( props: Props ) {
	const {
		listId,
		searchPlaceholder,
		currentUser,
		postType,
		postTypes,
		period,
		setPeriod,
		filters,
		onAddNewItem,
		onManageItem,
		actions,
		postId,
	} = props;

	// Filters.
	const [ customFilter, setCustomFilter ] = useState<string>( 'all' );
	const [ search, setSearch ] = useState<string>( '' );
	const [ type, setType ] = useState<string | null>( postType?.name || null );
	const [ user, setUser ] = useState<number | null>( null );
	const [ page, setPage ] = useState<number>( 1 );

	const {
		posts,
		pagination,
		isLoading,
	} = useSelect( select => {
		return {
			posts: select( 'accelerate' ).getPosts<Post[]>( {
				period,
				search,
				type,
				user,
				page,
				include: postId ? [ postId ] : [],
			} ),
			pagination: select( 'accelerate' ).getPagination<State[ 'pagination' ]>(),
			isLoading: select( 'accelerate' ).getIsLoading<boolean>(),
		};
	}, [ search, page, type, user, period, postId ] );

	const histogramDiffs: HistogramDiffs = useSelect( select => {
		const postIds = posts.map( p => p.id );
		if ( postIds.length === 0 ) {
			return {};
		}
		return select( 'accelerate' ).getDiffs<State['diffs'][ Duration ]>( {
			ids: postIds,
			period,
		} );
	}, [ posts, period ] );

	const currentPeriod = periods.find( p => p.value === period ) || periods[0];
	const maxViewsPerUrl = useSelect<number>( select => {
		const stats: StatsResult = select( 'accelerate' ).getStats( {
			period: currentPeriod.value,
			interval: currentPeriod.intervals[0].interval,
		} );
		return Math.max( 0, ...Object.values( stats?.stats.by_url || {} ) );
	}, [ currentPeriod ] );

	const customFilters: CustomFilters = {
		all: {
			label: __( 'All', 'altis' ),
			callback: () => {
				setType( postType?.name || null );
				setUser( null );
			}
		},
		blocks: {
			label: __( 'Blocks', 'altis' ),
			callback: () => {
				setType( 'wp_block,xb' );
				setUser( null );
			}
		},
		mine: {
			label: __( 'My content', 'altis' ),
			callback: () => {
				setType( postType?.name || null );
				setUser( currentUser.id || 1 );
			}
		}
	};

	const enabledCustomFilters: CustomFilters = filters.reduce( ( all, filter ) => {
		all[ filter ] = customFilters[ filter ];
		return all;
	}, {} as CustomFilters );

	function onSetCustomFilter ( filter: string ) {
		setPage( 1 );
		setCustomFilter( filter );

		customFilters[ filter ].callback( filter );
	}

	const redirectAddNewItem = function( type: string ) {
		window.location.href = '/wp-admin/post-new.php?post_type=' + type;
	}

	return (
		<div className="List">
			<div className="table-wrap">
				<ListFilters
					listId={ listId }
					customFilters={ enabledCustomFilters }
					periods={ periods }
					postTypes={ postTypes.filter( type => type.name !== 'xb' ) }
					period={ period }
					onSetPeriod={ setPeriod }
					customFilter={ customFilter }
					onSetCustomFilter={ onSetCustomFilter }
					search={ search }
					onSetSearch={ setSearch }
					searchPlaceholder={ searchPlaceholder }
					onAddNewItem={ onAddNewItem || redirectAddNewItem }
				/>
				<div className="table-content">
					<table aria-live="polite">
						<tbody>
							{ isLoading
								? [ ...Array( 8 ) ].map( ( _, i ) => (
									<ListItemPlaceholder i={ i } key={ i } /> )
								)
								: posts.length === 0 && (
									<tr>
										<td className="record-empty" colSpan={ 5 }>
											{ __( 'No content found...', 'altis' ) }
										</td>
									</tr>
								)
							}
							{ posts.length > 0 && posts.map( post => (
								<ListItem
									key={ post.id }
									listId={ listId }
									item={ post }
									maxViewsPerUrl={ maxViewsPerUrl }
									histogramDiffs={ histogramDiffs }
									period={ period }
									onManage={ onManageItem }
									actions={ actions }
								/>
							) ) }
						</tbody>
					</table>
					{ pagination.total > 0 && (
						<div className="table-footer">
							<div className="pagination">
								<Pagination
									initialPage={ 1 }
									itemsPerPage={ 25 }
									onPageСhange={ setPage }
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
