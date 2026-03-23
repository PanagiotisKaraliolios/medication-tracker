import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetData } from '../lib/widgetBridge';

interface NextDoseWidgetProps {
  data: WidgetData | null;
}

export function NextDoseWidget({ data }: NextDoseWidgetProps) {
  const nextDose = data?.nextDose ?? null;

  if (!nextDose) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        accessibilityLabel="MediTrack — No upcoming doses. Tap to open app."
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <TextWidget
          text="✓"
          style={{
            fontSize: 28,
            color: '#10B981',
          }}
        />
        <TextWidget
          text="All done for today!"
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#111827',
            marginTop: 4,
          }}
        />
        <TextWidget
          text="MediTrack"
          style={{
            fontSize: 11,
            color: '#9CA3AF',
            marginTop: 4,
          }}
        />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`MediTrack — Next dose: ${nextDose.name} ${nextDose.dosage} at ${nextDose.time}. Tap to open app.`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: {
          from: '#1FA2A6',
          to: '#2563EB',
          orientation: 'LEFT_RIGHT',
        },
        borderRadius: 16,
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <TextWidget
        text="Next Dose"
        style={{
          fontSize: 11,
          fontWeight: '500',
          color: '#FFFFFF',
        }}
        maxLines={1}
      />
      <TextWidget
        text={nextDose.name}
        style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#FFFFFF',
          marginTop: 4,
        }}
        maxLines={1}
        truncate="END"
      />
      <TextWidget
        text={nextDose.dosage}
        style={{
          fontSize: 13,
          color: '#FFFFFF',
          marginTop: 2,
        }}
        maxLines={1}
        truncate="END"
      />
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
          width: 'wrap_content',
        }}
      >
        <TextWidget
          text={`⏰ ${nextDose.time}`}
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: '#FFFFFF',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
