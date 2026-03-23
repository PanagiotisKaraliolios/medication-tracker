import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { readWidgetData } from '../lib/widgetBridge';
import { NextDoseWidget } from './NextDoseWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await readWidgetData();
      renderWidget(<NextDoseWidget data={data} />);
      break;
    }
    case 'WIDGET_DELETED':
      // Nothing to clean up
      break;
    case 'WIDGET_CLICK':
      // Click actions are handled via clickAction="OPEN_APP" on the widget
      break;
    default:
      break;
  }
}
