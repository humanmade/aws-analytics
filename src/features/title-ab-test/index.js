import React, { Fragment } from 'react';
import DatesField from './field-dates';
import TitleTextField from './field-title-text';
import TrafficPercentageField from './field-traffic-percentage';
import PauseField from './field-pause';
import Results from './results';
import styled from 'styled-components';

const { PluginSidebar, PluginSidebarMoreMenuItem } = wp.editPost;
const { registerPlugin } = wp.plugins;
const { __ } = wp.i18n;
const {
	Panel, PanelBody, PanelRow
} = wp.components;

const PanelRowInner = styled.div`
.components-base-control__help { margin-top: 5px; color: #666; }
.components-range-control .components-base-control__label { max-width: 100%; }
`

registerPlugin('hm-analytics-ab-test', {
	title: __('Experiments'),
	icon: 'lightbulb',
	render() {
		return (
			<Fragment>
				<PluginSidebarMoreMenuItem
					target="hm-analytics-ab-test"
				>
					{ __('Experiments') }
				</PluginSidebarMoreMenuItem>
				<PluginSidebar
					name="hm-analytics-ab-test"
					title={__('Experiments')}
				>
					<Panel>
						<PanelBody
							title={__('Post Title A/B Tests')}
							icon="editor-paragraph"
							initialOpen={true}
						>
							<PanelRow>
								<PanelRowInner>
									<Results />
								</PanelRowInner>
							</PanelRow>
							<PanelRow>
								<PanelRowInner>
									<p>{__('Add multiple post titles and see how each performs in real time.')}</p>
									<p>{__('To get started fill out the title fields below.')}</p>
									<TitleTextField />
								</PanelRowInner>
							</PanelRow>
							<PanelRow>
								<PanelRowInner>
									<TrafficPercentageField />
								</PanelRowInner>
							</PanelRow>
							<PanelRow>
								<PanelRowInner>
									<DatesField />
								</PanelRowInner>
							</PanelRow>
							<PanelRow>
								<PanelRowInner>
									<PauseField />
								</PanelRowInner>
							</PanelRow>
						</PanelBody>
					</Panel>
				</PluginSidebar>
			</Fragment>
		)
	},
} );
