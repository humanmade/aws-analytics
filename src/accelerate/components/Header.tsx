import { __ } from '@wordpress/i18n';

import Logo from './altis-logo.svg';

interface Props {
	version: string,
}

export default function Header( props: Props ) {
	return (
		<div className="Header">
			<div className="Logo">
				<img src={ Logo } alt="Altis Accelerate" width="64" height="26" />
				<span className="Beta">
					{ __( 'BETA', 'altis' ) }
				</span>
			</div>
			<div className="Version">
				{ props.version }
			</div>
		</div>
	)
}
