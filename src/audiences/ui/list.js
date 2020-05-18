import React, { Component, Fragment } from 'react';
import styled, { css } from 'styled-components';
import Fuse from 'fuse.js';
import ListRowLoading from './components/list-row-loading';
import Estimate from './components/estimate';

const { compose } = wp.compose;
const {
	withSelect,
	withDispatch,
} = wp.data;
const { __, sprintf } = wp.i18n;
const {
	Button,
	IconButton,
	Notice,
	ToggleControl,
} = wp.components;

const ActionLink = ( {
	post,
	label,
	children = null,
	className = '',
	onClick,
} ) => (
	<Button
		isLink
		className={ className }
		onClick={ event => {
			event.preventDefault();
			onClick( post );
		} }
		aria-label={ sprintf( label, post.title.rendered ) }
	>
		{ children || post.title.rendered }
	</Button>
);

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

const AudienceSort = styled.span`
	display: flex;
	flex-direction: row;
	align-items: center;

	.audience-sort-order {
		&__number {
			font-weight: bold;
			flex: 1;
		}
		&__controls {
			flex: 1;
			button {
				padding: 3px;
			}
		}
		&__up {
			margin-bottom: 2px;
		}
	}
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

	selectRow = ( event, post ) => {
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

	render() {
		const {
			canCreate,
			canEdit,
			posts,
			pagination,
			getPosts,
			onEdit,
			onSelect,
			deletePost,
			updatePost,
			loading,
		} = this.props;

		const {
			page,
			search,
			error,
		} = this.state;

		const EditLink = props => (
			<ActionLink
				label={ __( 'Edit “%s”' ) }
				onClick={ onEdit }
				{ ...props }
			/>
		);

		const TrashLink = props => (
			<ActionLink
				label={ __( 'Move “%s” to the Trash' ) }
				className="is-destructive"
				onClick={ post => deletePost( post.id ) }
				{ ...props }
			/>
		);

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

		const ColumnHeadings = () => (
			<tr>
				<th scope="col" className="manage-column column-order">
					{ __( 'Priority', 'altis-analytics' ) }
				</th>
				<th scope="col" className="manage-column column-title column-primary">
					{ __( 'Title', 'altis-analytics' ) }
				</th>
				<th scope="col" className="manage-column column-active">
					{ __( 'Status', 'altis-analytics' ) }
				</th>
				<th scope="col" className="manage-column column-estimate">
					{ __( 'Size', 'altis-analytics' ) }
				</th>
				{ isSelectMode && (
					<th scope="col" className="manage-column column-select">&nbsp;</th>
				) }
			</tr>
		);

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
						onChange={ event => {
							const value = event.target.value;
							this.setState( {
								page: 1,
								search: value,
							} );
							// Query posts by the search term.
							if ( ! loading ) {
								getPosts( page, value );
							}
						} }
					/>
				</div>
				<table className="wp-list-table widefat fixed striped posts">
					<thead>
						<ColumnHeadings />
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
							const canEditAudience = canEdit( post.id );

							return (
								<tr
									key={ post.id }
									className={ `audience-row audience-row--${ post.status === 'publish' ? 'active' : 'inactive' }` }
									onClick={ event => this.selectRow( event, post ) }
								>
									<td>
										<AudienceSort className="audience-sort-order">
											<span className="audience-sort-order__number">{ index + 1 }</span>
											{ canEditAudience && (
												<span className="audience-sort-order__controls">
													<IconButton
														className="audience-sort-order__up"
														icon="arrow-up-alt2"
														label={ __( 'Move up', 'altis-analytics' ) }
														disabled={ ! filteredPosts[ index - 1 ] }
														onClick={ () => {
															updatePost( {
																id: post.id,
																menu_order: post.menu_order - 1,
															} );
															updatePost( {
																id: filteredPosts[ index - 1 ].id,
																menu_order: post.menu_order,
															} );
														} }
													/>
													<IconButton
														className="audience-sort-order__down"
														icon="arrow-down-alt2"
														label={ __( 'Move down', 'altis-analytics' ) }
														disabled={ ! filteredPosts[ index + 1 ] }
														onClick={ () => {
															updatePost( {
																id: post.id,
																menu_order: post.menu_order + 1,
															} );
															updatePost( {
																id: filteredPosts[ index + 1 ].id,
																menu_order: post.menu_order,
															} );
														} }
													/>
												</span>
											) }
										</AudienceSort>
									</td>
									<td>
										{ ! canEditAudience && (
											<span className="row-title">
												<strong>{ post.title.rendered || __( '(no title)', 'altis-analytics' ) }</strong>
											</span>
										) }
										{ canEditAudience && (
											<EditLink className="row-title" post={ post }>
												<strong>{ post.title.rendered || __( '(no title)', 'altis-analytics' ) }</strong>
											</EditLink>
										) }
										{ canEditAudience && (
											<div className="row-actions">
												<span className="edit">
													<EditLink post={ post }>
														{ __( 'Edit' ) }
													</EditLink>
												</span>
												{ ' | ' }
												<span className="trash">
													<TrashLink post={ post }>
														{ __( 'Trash' ) }
													</TrashLink>
												</span>
											</div>
										) }
									</td>
									<td>
										<ToggleControl
											disabled={ ! canEditAudience }
											checked={ post.status === 'publish' }
											help={ post.status === 'publish' ? __( 'Audience is active', 'altis-analytics' ) : __( 'Audience is inactive', 'altis-analytics' ) }
											label={ __( 'Active', 'altis-analytics' ) }
											onChange={ () => updatePost( {
												id: post.id,
												status: post.status === 'publish' ? 'draft' : 'publish',
											} ) }
										/>
									</td>
									<td>
										<Estimate audience={ post.audience } horizontal />
									</td>
									{ isSelectMode && (
										<td>
											{ post.status === 'publish' && (
												<Button
													className="button"
													onClick={ () => onSelect( post ) }
												>
													{ __( 'Select', 'altis-analytics' ) }
												</Button>
											) }
										</td>
									) }
								</tr>
							);
						} ) }
						{ ! loading && pagination.total > filteredPosts.length && (
							<tr className="audience-row audience-row--load-more">
								<td colSpan={ isSelectMode ? 5 : 4 }>
									<Button
										className="button"
										onClick={ () => {
											getPosts( page + 1, search );
											this.setState( { page: page + 1 } );
										} }
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
						<ColumnHeadings />
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

	const { canUser } = select( 'core' );
	const canCreate = canUser( 'create', 'audiences' );

	return {
		canCreate,
		canEdit: id => canUser( 'update', 'audiences', id ),
		getPosts,
		pagination,
		posts,
		loading,
	};
} );

const applyWithDispatch = withDispatch( dispatch => {
	const {
		deletePost,
		updatePost,
	} = dispatch( 'audience' );

	return {
		deletePost: id => {
			if ( window.confirm( __( 'Are you sure you want to permanently delete this audience?', 'altis-analytics' ) ) ) {
				deletePost( id );
			}
		},
		updatePost,
	};
} );

export default compose(
	applyWithSelect,
	applyWithDispatch
)( List );
