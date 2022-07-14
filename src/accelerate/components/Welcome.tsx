import { sprintf, __ } from '@wordpress/i18n';

import { InitialData } from '../../util';

interface Props {
	user: InitialData[ 'user' ],
}

export default function Welcome( props: Props ) {
	return (
		<div className="WelcomeIntro">
			<h2>
				{ sprintf( __( 'Welcome %s', 'altis' ), props.user.name ) }
			</h2>
			<p>
				{ __( 'This is the Altis dashboard -- Your standard WordPress dashboard & widgets are still', 'altis' ) }
				<a href='?widgets=true'>
					{ __( 'available here', 'altis' ) }
				</a>
				{ __( '( or under the menu on the left ).', 'altis' ) }
			</p>
		</div>
	)
}
