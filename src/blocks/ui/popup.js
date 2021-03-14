import React, { useState } from 'react';
import styled from 'styled-components';

import Modal from '../../components/modal';

import Block from './block';

const { Button } = wp.components;
const { useSelect } = wp.data;
const { __ } = wp.i18n;

const StyledModal = styled( Modal )`
	margin: 0 auto;
	max-width: 70rem;

	&& .media-frame-content {
		top: 0;
		border: 0;
	}

	.altis-analytics-block {
		margin-left: 0;
	}
`;

const StyledPopup = styled.div`
	margin: 10px 0 20px;
`;

/**
 * Select audience component.
 *
 * @param {object} props Component props.
 * @param {string} props.clientId The block client ID.
 * @returns {React.ReactNode} The popup controller component.
 */
function Popup( { clientId } ) {

	const [ show, setShow ] = useState( false );
	const block = useSelect( select => {
		return select( 'analytics/xbs' ).getPost( clientId );
	}, [ clientId ] );

	if ( ! block || block.error ) {
		return null;
	}

	return (
		<StyledPopup className="audience-select">
			<div className="audience-select__info">
				<Button
					isPrimary
					onClick={ () => setShow( true ) }
				>
					{ __( 'View experience insights', 'altis-analytics' ) }
				</Button>
			</div>
			{ show && (
				<StyledModal
					portalId="altis-analytics-xb-block-modal"
					onClose={ () => setShow( false ) }
				>
					<Block clientId={ clientId } showPosts={ false } />
				</StyledModal>
			) }
		</StyledPopup>
	);
}

export default Popup;
