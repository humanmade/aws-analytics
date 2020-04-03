import React, { Component, createRef } from 'react';
import styled from 'styled-components';

import AudienceEditor from './components/audience-editor';
import Estimate from './components/estimate';
import { defaultPost, defaultAudience } from './data/defaults';

const {
	withSelect,
	withDispatch,
} = wp.data;
const { __ } = wp.i18n;
const {
	Button,
	ToggleControl,
	Notice,
	Snackbar,
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
	constructor( props ) {
		super( props );

		this.state = {
			notice: null,
			error: null,
		};

		this.titleRef = createRef();

		this.onSubmit = this.onSubmit.bind( this );
	}

	componentDidMount() {
		// Get the form element if there is one. This is for back compat with
		// the legacy post edit screen.
		if ( formElement ) {
			formElement.addEventListener( 'submit', this.onSubmit );
		}

		// Focus the title.
		this.titleRef.current.focus();
	}

	componentDidUpdate( prevProps ) {
		// Focus the title after loading.
		if ( prevProps.loading && ! this.props.loading ) {
			this.titleRef.current.focus();
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

	onSubmit( event ) {
		// Clear errors.
		this.setState( { error: null } );

		const { post } = this.props;

		if ( post && post.title.rendered.length === 0 ) {
			event.preventDefault();
			this.setState( {
				error: __( 'The title cannot be empty', 'altis-analytics' ),
			} );
			return;
		}

		// Prevent the "Leave site?" warning popup showing.
		window.onbeforeunload = null;
		window.jQuery && window.jQuery( window ).off( 'beforeunload' );
	}

	render() {
		const {
			error,
			notice,
		} = this.state;

		const {
			post,
			setTitle,
			setAudience,
			setStatus,
			loading,
		} = this.props;

		return (
			<StyledEdit className={ `audience-ui ${ loading ? 'audience-ui--loading' : '' }` }>
				{ error && (
					<Notice
						status="error"
						isDismissable
						onRemove={ () => this.setState( { error: null } ) }
					>
						{ error.toString() }
					</Notice>
				) }
				{ notice && (
					<Snackbar
						onRemove={ () => this.setState( { notice: null } ) }
					>
						<p>{ notice }</p>
					</Snackbar>
				) }

				<div id="titlediv">
					<input
						id="title"
						type="text"
						name="post_title"
						value={ post.title.rendered }
						onChange={ e => setTitle( e.target.value ) }
						placeholder={ __( 'Add title', 'altis-analytics' ) }
						ref={ this.titleRef }
						disabled={ loading }
					/>
				</div>

				<div className="audience-settings">
					<AudienceEditor
						audience={ post.audience || defaultAudience }
						onChange={ value => setAudience( value ) }
					/>

					<div className="audience-options">
						<Estimate
							title={ __( 'Audience size', 'altis-analytics' ) }
							audience={ post.audience }
							sparkline
						/>
						<h3>{ __( 'Audience options', 'altis-analytics' ) }</h3>
						<ToggleControl
							label={ __( 'Active', 'altis-analytics' ) }
							help={ post.status === 'publish' ? __( 'Audience is active', 'altis-analytics' ) : __( 'Audience is inactive', 'altis-analytics' ) }
							checked={ post.status === 'publish' }
							onChange={ () => setStatus( post.status === 'publish' ? 'draft' : 'publish' ) }
							disabled={ loading }
						/>
						<input type="hidden" name="post_status" value={ post.status } />
						<Button
							isLarge
							isPrimary
							type="submit"
							onClick={ e => {
								if ( ! this.formElement ) {
									this.onSubmit( e );
								}
							} }
							disabled={ loading }
						>
							{ __( 'Save changes', 'altis-analytics' ) }
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
	onCreate: () => { },
	setTitle: () => { },
	setAudience: () => { },
	setStatus: () => { },
};

const EditWithSelect = withSelect( ( select, props ) => {
	let post = props.post;

	if ( props.postId ) {
		post = select( 'audience' ).getPost( props.postId );
	}

	// If we have a post ID but no post then we're loading.
	const loading = props.postId && ! post.id;

	return {
		post,
		loading,
	};
} )( Edit );

const EditWithDispatch = withDispatch( dispatch => {
	const store = dispatch( 'audience' );

	return {
		setTitle: value => {
			store.setPost( { title: { rendered: value } } );
		},
		setAudience: value => {
			store.setPost( { audience: value } );
		},
		setStatus: value => {
			store.setPost( { status: value } );
		},
	};
} )( EditWithSelect );

export default EditWithDispatch;
