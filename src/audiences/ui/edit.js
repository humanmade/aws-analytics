import React, { Component } from 'react';
import styled from 'styled-components';

import AudienceEditor from './components/audience-editor';
import Estimate from './components/estimate';
import { defaultPost, defaultAudience } from './data/defaults';

const { compose } = wp.compose;
const {
	withSelect,
	withDispatch,
} = wp.data;
const { __ } = wp.i18n;
const {
	Button,
	ToggleControl,
	Notice,
	Spinner,
} = wp.components;

const formElement = document.querySelector( '.post-type-audience #post' );

const StyledEdit = styled.div`
	margin: 20px 0;

	.components-notice {
		margin: 0 0 20px;
	}

	.audience-settings {
		display: flex;
	}

	.audience-settings > * {
		flex: 1;
	}

	.audience-options {
		flex: 0 1 320px;
		margin: 20px 0 20px 40px;
	}

	.audience-estimate {
		margin-bottom: 40px;
	}
`;

class Edit extends Component {
	state = {
		notice: null,
		error: null,
	};

	componentDidMount() {
		// Get the form element if there is one. This is for back compat with
		// the legacy post edit screen.
		if ( formElement ) {
			formElement.addEventListener( 'submit', this.onSubmit );
		}
	}

	componentWillUnmount() {
		if ( formElement ) {
			formElement.removeEventListener( 'submit', this.onSubmit );
		}
	}

	static getDerivedStateFromError( error ) {
		return { error };
	}

	componentDidCatch( error, errorInfo ) {
		console.error( error, errorInfo );
	}

	onSubmit = event => {
		// Clear errors.
		this.setState( { error: null } );

		const { post, savePost } = this.props;

		if ( post && post.title.rendered.length === 0 ) {
			event.preventDefault();
			this.setState( {
				error: __( 'The title cannot be empty', 'altis-analytics' ),
			} );
			return;
		}

		if ( formElement ) {
			// Prevent the "Leave site?" warning popup showing.
			window.onbeforeunload = null;
			window.jQuery && window.jQuery( window ).off( 'beforeunload' );
			return;
		}

		savePost( post );
	}

	render() {
		const {
			loading,
			saving,
			post,
			onSetTitle,
			onSetAudience,
			onSetStatus,
		} = this.props;

		const {
			error,
			notice,
		} = this.state;

		return (
			<StyledEdit className={ `audience-ui ${ loading ? 'audience-ui--loading' : '' }` }>
				{ error && (
					<Notice
						isDismissable
						status="error"
						onRemove={ () => this.setState( { error: null } ) }
					>
						{ error.toString() }
					</Notice>
				) }
				{ notice && (
					<Notice
						isDismissable
						status="success"
						onRemove={ () => this.setState( { notice: null } ) }
					>
						{ notice }
					</Notice>
				) }

				<div id="titlediv">
					<input
						autoFocus
						disabled={ loading }
						id="title"
						name="post_title"
						placeholder={ __( 'Add title', 'altis-analytics' ) }
						type="text"
						value={ post.title.rendered }
						onChange={ e => onSetTitle( e.target.value ) }
					/>
				</div>

				<div className="audience-settings">
					<AudienceEditor
						audience={ post.audience || defaultAudience }
						onChange={ onSetAudience }
					/>

					<div className="audience-options">
						<Estimate
							audience={ post.audience }
							title={ __( 'Audience size', 'altis-analytics' ) }
							sparkline
						/>
						<h3>{ __( 'Audience options', 'altis-analytics' ) }</h3>
						<ToggleControl
							checked={ post.status === 'publish' }
							disabled={ loading }
							help={ post.status === 'publish' ? __( 'Audience is active', 'altis-analytics' ) : __( 'Audience is inactive', 'altis-analytics' ) }
							label={ __( 'Active', 'altis-analytics' ) }
							onChange={ () => onSetStatus( post.status === 'publish' ? 'draft' : 'publish' ) }
						/>
						<input
							name="post_status"
							type="hidden"
							value={ post.status }
						/>
						<Button
							disabled={ loading || saving }
							isLarge
							isPrimary
							type="submit"
							onClick={ e => {
								if ( ! this.formElement ) {
									this.onSubmit( e );
								}
							} }
						>
							{ ! saving && __( 'Save changes', 'altis-analytics' ) }
							{ saving && __( 'Saving changes', 'altis-analytics' ) }
							{ saving && <Spinner /> }
						</Button>
					</div>
				</div>
			</StyledEdit>
		);
	}
}

Edit.defaultProps = {
	postId: null,
	post: defaultPost,
	loading: false,
	saving: false,
	onCreate: () => { },
	onSetTitle: () => { },
	onSetAudience: () => { },
	onSetStatus: () => { },
	savePost: () => { },
};

const applyWithSelect = withSelect( ( select, props ) => {
	const {
		getCurrentPost,
		getIsLoading,
		getIsUpdating,
	} = select( 'audience' );

	let post = getCurrentPost() || props.post;

	if ( props.postId ) {
		post = getCurrentPost( props.postId );
	}

	// If we have a post ID but no post then we're loading.
	const loading = getIsLoading();

	// Determine if we're currently saving the post.
	const saving = getIsUpdating();

	return {
		post,
		loading,
		saving,
	};
} );

const applyWithDispatch = withDispatch( dispatch => {
	const { setCurrentPost, updatePost } = dispatch( 'audience' );

	return {
		onSetTitle: value => {
			setCurrentPost( { title: { rendered: value } } );
		},
		onSetAudience: value => {
			setCurrentPost( { audience: value } );
		},
		onSetStatus: value => {
			setCurrentPost( { status: value } );
		},
		savePost: post => {
			updatePost( post );
		},
	};
} );

export default compose(
	applyWithDispatch,
	applyWithSelect,
)( Edit );
