import { __ } from '@wordpress/i18n';

import { InitialData } from '../../util';
import Logo from '../assets/altis-logo.svg';

interface Props {
	version: InitialData['version'],
}

export default function Header( props: Props ) {
	return (
		<div className="Header">
			<div className="Logo">
				<img src={ Logo } alt="Altis Accelerate" width="64" height="26" />
				{ props.version?.match( /beta/i ) && (
					<span className="Beta">
						{ __( 'BETA', 'altis' ) }
					</span>
				) }
			</div>
			<div className="Version">
				{ props.version }
			</div>
		</div>
	)
}
