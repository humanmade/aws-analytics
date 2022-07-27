import { decodeEntities } from '@wordpress/html-entities';
import { sprintf, __ } from '@wordpress/i18n';

import { InitialData, trackEvent } from '../../util';

interface Props {
	user: InitialData[ 'user' ],
}

export default function Welcome( props: Props ) {
	return (
		<div className="WelcomeIntro">
			<h2>
				{ sprintf( __( 'Welcome %s', 'altis' ), decodeEntities( props.user.name ) ) }
			</h2>
			<p>
				{ __( 'This is the Altis dashboard', 'altis' ) }
				{ '  — ' }
				<a href='?widgets=true' onClick={ () => trackEvent( 'Content Explorer', 'Widgets Page' ) }>
					{ __( 'your standard WordPress dashboard & widgets are still available here', 'altis' ) }
				</a>
				{ ' ' }
				({ __( 'or under the menu on the left', 'altis' ) }).
			</p>
		</div>
	)
}
