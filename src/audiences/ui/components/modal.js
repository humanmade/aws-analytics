import React, { Component, Fragment } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

const { __ } = wp.i18n;

const StyledModal = styled.div`
	.media-frame-content {
		bottom: 0;
	}
`;

class Modal extends Component {
	constructor( props ) {
		super( props );
		this.modalRoot = document.getElementById( 'altis-analytics-audience-modal' );
		this.el = document.createElement( 'div' );
	}

	componentDidMount() {
		this.modalRoot.appendChild( this.el );
	}

	componentWillUnmount() {
		this.modalRoot.removeChild( this.el );
	}

	render() {
		const {
			children,
			className,
			onClose,
			title,
		} = this.props;

		return createPortal(
			<Fragment>
				<StyledModal tabIndex="0" className={ `media-modal wp-core-ui ${ className }` } role="dialog" aria-labelledby="media-frame-title">
					<button type="button" className="media-modal-close" onClick={ onClose }>
						<span className="media-modal-icon">
							<span className="screen-reader-text">{ __( 'Close dialog' ) }</span>
						</span>
					</button>
					{ title && (
						<div className="media-frame-title" id="media-frame-title">
							<h1>{ title }</h1>
						</div>
					) }
					<div className="media-modal-content" role="document">
						<div className="media-frame wp-core-ui hide-menu hide-router">
							<div className="media-frame-content">
								{ children }
							</div>
						</div>
					</div>
				</StyledModal>
				<div className="media-modal-backdrop"></div>
			</Fragment>,
			this.el
		);
	}
}

export default Modal;
