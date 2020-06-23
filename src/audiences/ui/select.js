import React, { Component, Fragment } from 'react';
import styled from 'styled-components';
import Manager from './manager';
import Modal from './components/modal';

const {
	IconButton,
	Spinner,
} = wp.components;
const { compose } = wp.compose;
const { withSelect } = wp.data;
const { decodeEntities } = wp.htmlEntities;
const { __ } = wp.i18n;

const StyledModal = styled( Modal )`
	.altis-audience-manager {
		margin: 20px;

		&__header {
			position: fixed;
			left: 50px;
			top: 30px;
			z-index: 10;

			@media only screen and (max-width: 640px), screen and (max-height: 400px) {
				left: 20px;
				top: 0;
			}

			h1 {
				vertical-align: middle;
			}
		}
	}
	.altis-audience-manager table {
		width: 100%;
	}
`;

const StyledSelect = styled.div`
	.audience-select__label {
		display: block;
		margin-bottom: 4px;
	}
	.audience-select__controls {
		margin-left: -3px;
		display: flex;

		button {
			padding-left: 0;
			padding-right: 0;

			&:not(:disabled):not([aria-disabled=true]):not(.is-secondary):not(.is-primary):not(.is-tertiary):not(.is-link):hover,
			&:not(:disabled):not([aria-disabled=true]):not(.is-secondary):not(.is-primary):not(.is-tertiary):not(.is-link):focus {
				box-shadow: none;
				text-decoration: underline;
			}
		}
	}
	.audience-select__clear {
		margin-left: -2px;
		margin-right: 5px;

		&:hover svg, &:focus svg {
			fill: #d94f4f;
		}
	}
`;

class Select extends Component {

	state = {
		show: false,
	}

	render() {
		const {
			label,
			audience,
			audiencePost,
			onSelect,
			onClearSelection,
		} = this.props;
		const { show } = this.state;

		const buttonLabel = audience
			? __( 'Change Audience', 'altis-analytics' )
			: __( 'Select Audience', 'altis-analytics' );

		const status = ( audiencePost && audiencePost.status ) || 'draft';
		const error = audiencePost && audiencePost.error && audiencePost.error.message;
		const title = audiencePost && audiencePost.title && audiencePost.title.rendered;

		return (
			<StyledSelect className="audience-select">
				<div className="audience-select__info">
					{ label && <label className="audience-select__label">{ label }</label> }
					<div className="audience-select__controls">
						{ audience && onClearSelection && (
							<IconButton
								className="audience-select__clear"
								icon="no-alt"
								label={ __( 'Clear selection', 'altis-analytics' ) }
								onClick={ onClearSelection }
							/>
						) }
						<IconButton
							className="audience-select__choose"
							icon="edit"
							label={ buttonLabel }
							onClick={ () => this.setState( { show: true } ) }
						>
							{ audience && ! audiencePost && (
								<Fragment>
									<Spinner />
									{ __( 'Loading...', 'altis-analytics' ) }
								</Fragment>
							) }
							{ error && (
								<strong className="audience-select__value audience-select__value--error">{ error }</strong>
							) }
							{ status === 'trash' && title && (
								<strong className="audience-select__value">{ __( '(deleted)', 'altis-analytics' ) }</strong>
							) }
							{ status !== 'trash' && title && (
								<strong className="audience-select__value">{ decodeEntities( title ) }</strong>
							) }
							{ ! audience && buttonLabel }
						</IconButton>
					</div>
				</div>
				{ show && (
					<StyledModal
						onClose={ () => this.setState( { show: false } ) }
					>
						<Manager
							onSelect={ post => {
								this.setState( { show: false } );
								onSelect( post.id, post );
							} }
						/>
					</StyledModal>
				) }
			</StyledSelect>
		);
	}
}

const applyWithSelect = withSelect( ( select, props ) => {
	let audiencePost = null;

	if ( props.audience ) {
		audiencePost = select( 'audience' ).getPost( props.audience );
	}

	return {
		audiencePost,
	};
} );

export default compose(
	applyWithSelect
)( Select );
