import React, { Component } from 'react';

const { compose } = wp.compose;
const {
	withSelect,
	withDispatch,
} = wp.data;
const { __, _n, sprintf } = wp.i18n;
const {
	Button,
	ToggleControl,
	Notice,
	Snackbar,
} = wp.components;

class List extends Component {

	render() {
		const {
			posts,
		} = this.props;

		if ( ! posts.length ) {
			return null;
		}

		return (
			<div className="audience-listing">
				<p className="search-box">
					<label className="screen-reader-text" htmlFor="audience-search-input">{ __( 'Search Audiences', 'altis-analytics' ) }:</label>
					<input type="search" id="audience-search-input" name="s" value="" />
					<input type="submit" id="audience-search-submit" className="button" value={ __( 'Search Audiences', 'altis-analytics' ) } />
				</p>

				<div className="tablenav top">
					<div className="tablenav-pages one-page">
						<span className="displaying-num">{ sprintf( _n( '%d item', '%d items', posts.length ), posts.length ) }</span>
					</div>
					<br className="clear" />
				</div>
			</div>
		);
	}

}

const applyWithSelect = withSelect( ( select, props ) => {
	// Extract audience query props.
	const {
		page = 1,
		search = '',
	} = props;

	const posts = select( 'audience' ).getPosts( page, search );

	return {
		posts,
	};
} );

const applyWithDispatch = withDispatch( dispatch => {
	const store = dispatch( 'audience' );

	return {};
} );

export default compose(
	applyWithSelect,
	applyWithDispatch
)( List );
