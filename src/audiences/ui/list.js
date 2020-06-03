import React, { Component, Fragment } from 'react';
import styled, { css } from 'styled-components';
import Fuse from 'fuse.js';
import ListRowHeading from './components/list-row-heading';
import ListRowLoading from './components/list-row-loading';
import ListRow from './components/list-row';

const { compose } = wp.compose;
const {
	withSelect,
	withDispatch,
} = wp.data;
const { __ } = wp.i18n;
const {
	Button,
	Notice,
} = wp.components;

const selectModeCSS = css`
	tbody tr.audience-row--active:hover {
		cursor: pointer;
		background-color: rgba(70, 103, 222, .2);
	}
`;

const AudienceList = styled.div`
	.audience-list__search-box {
		width: 100%;
		margin-bottom: 5px;
	}
	#audience-search-input {
		width: 100%;
	}
	.column-order {
		width: 3rem;
	}
	.column-active {
		width: 14rem;
	}
	.column-select {
		width: 5rem;
	}
	& .audience-estimate__percentage {
		max-width: 4rem;
	}
	button.is-link,
	button.is-link:hover {
		text-decoration: none;
	}
	button.is-link:focus,
	button.is-link:active {
		border: 0;
		background: none;
		text-decoration: underline;
	}

	.audience-row--no-results td,
	.audience-row--load-more td {
		padding: 30px;
		vertical-align: middle;
		text-align: center;
	}

	${ props => props.selectMode && selectModeCSS }
`;

class List extends Component {

	state = {
		page: 1,
		search: '',
		error: null,
	};

	static getDerivedStateFromError( error ) {
		return { error };
	}

	componentDidCatch( error, errorInfo ) {
		console.error( error, errorInfo );
	}

	onSearch = event => {
		const value = event.target.value;
		this.setState( {
			page: 1,
			search: value,
		} );
		// Query posts by the search term.
		if ( ! this.props.loading ) {
			this.props.getPosts( this.state.page, value );
		}
	}

	onSelectRow = ( event, post ) => {
		// Check if it's an active audience.
		if ( post.status !== 'publish' ) {
			return;
		}

		// Check elements a few levels up to see if they're interactive.
		let el = event.target;
		let depth = 0;
		do {
			if ( [ 'A', 'INPUT', 'BUTTON' ].indexOf( el.nodeName ) >= 0 ) {
				return;
			}
			el = el.parentNode;
		} while ( depth++ < 4 );

		// Ignore events on other targets.
		event.stopPropagation();

		// Trigger on select behaviour if we're in select mode.
		this.props.onSelect && this.props.onSelect( post );
	}

	onMove = ( posts, index, direction = 'up' ) => {
		const post = posts[ index ];
		const directionInt = direction === 'up' ? -1 : 1;

		// Swap the menu order of the audiences in the direction of prioritisation.
		this.props.updatePost( {
			id: post.id,
			menu_order: post.menu_order + directionInt,
		} );
		this.props.updatePost( {
			id: posts[ index + directionInt ].id,
			menu_order: post.menu_order,
		} );
	}

	onNextPage = () => {
		const { page, search } = this.state;
		this.props.getPosts( page + 1, search );
		this.setState( { page: page + 1 } );
	}

	render() {
		const {
			canCreate,
			posts,
			pagination,
			onEdit,
			onSelect,
			loading,
		} = this.props;

		const {
			search,
			error,
		} = this.state;

		// Filter posts using fuzzy matching on title and rule values.
		const fuse = new Fuse( posts, {
			keys: [
				'title.rendered',
				'audience.groups.rules.value',
			],
			shouldSort: false,
		} );

		const filteredPosts = search
			? fuse.search( search ).map( result => result.item )
			: posts;

		// Whether to show the 5th column or not.
		const isSelectMode = filteredPosts && filteredPosts.length > 0 && onSelect;

		return (
			<AudienceList className="audience-listing" selectMode={ isSelectMode }>
				{ error && (
					<Notice
						status="error"
						isDismissable
						onRemove={ () => this.setState( { error: null } ) }
					>
						{ error.toString() }
					</Notice>
				) }
				<div className="audience-list__search-box">
					<label className="screen-reader-text" htmlFor="audience-search-input">
						{ __( 'Search Audiences', 'altis-analytics' ) }
					</label>
					<input
						type="search"
						id="audience-search-input"
						name="s"
						value={ search }
						placeholder={ __( 'Search Audiences', 'altis-analytics' ) }
						onChange={ this.onSearch }
					/>
				</div>
				<table className="wp-list-table widefat fixed striped posts">
					<thead>
						<ListRowHeading selectMode={ isSelectMode } />
					</thead>
					<tbody>
						{ ! loading && filteredPosts.length === 0 && (
							<tr className="audience-row audience-row--no-results">
								<td colSpan={ isSelectMode ? 5 : 4 }>
									{ __( 'No audiences were found', 'altis-analytics' ) }
									{ search.length > 0 && ` ${ __( 'for that search term', 'altis-analytics' ) }` }
									{ '. ' }
									{ canCreate && (
										<Button
											isLink
											onClick={ () => onEdit() }
										>
											{ __( 'Create a new audience.' ) }
										</Button>
									) }
								</td>
							</tr>
						) }
						{ filteredPosts.length > 0 && filteredPosts.map( ( post, index ) => {
							return (
								<ListRow
									key={ post.id }
									index={ index }
									post={ post }
									canMoveUp={ filteredPosts[ index - 1 ] }
									canMoveDown={ filteredPosts[ index + 1 ] }
									onMoveUp={ () => this.onMove( filteredPosts, index, 'up' ) }
									onMoveDown={ () => this.onMove( filteredPosts, index, 'down' ) }
									onClick={ event => this.onSelectRow( event, post ) }
									onEdit={ onEdit }
									onSelect={ onSelect }
								/>
							);
						} ) }
						{ ! loading && pagination.total > filteredPosts.length && (
							<tr className="audience-row audience-row--load-more">
								<td colSpan={ isSelectMode ? 5 : 4 }>
									<Button
										className="button"
										onClick={ this.onNextPage }
									>
										{ __( 'Load more audiences', 'altis-analytics' ) }
									</Button>
								</td>
							</tr>
						) }
						{ loading && (
							<Fragment>
								<ListRowLoading />
								<ListRowLoading />
								<ListRowLoading />
							</Fragment>
						) }
					</tbody>
					<tfoot>
						<ListRowHeading selectMode={ isSelectMode } />
					</tfoot>
				</table>
			</AudienceList>
		);
	}
}

List.defaultProps = {
	posts: [],
	pagination: {
		total: 0,
		pages: 0,
	},
};

const applyWithSelect = withSelect( select => {
	const {
		getPosts,
		getIsLoading,
		getPagination,
	} = select( 'audience' );
	const posts = getPosts();
	const loading = getIsLoading();
	const pagination = getPagination();

	const canCreate = select( 'core' ).canUser( 'create', 'audiences' );

	return {
		canCreate,
		getPosts,
		pagination,
		posts,
		loading,
	};
} );

const applyWithDispatch = withDispatch( dispatch => {
	const { updatePost } = dispatch( 'audience' );

	return {
		updatePost,
	};
} );

export default compose(
	applyWithSelect,
	applyWithDispatch
)( List );
