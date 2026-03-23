import SwiftUI
import WidgetKit

struct NextDoseEntry: TimelineEntry {
    let date: Date
    let name: String?
    let dosage: String?
    let time: String?
    let icon: String?
    let isEmpty: Bool
}

struct NextDoseProvider: TimelineProvider {
    private let appGroupID = "group.com.anonymous.medicationtracker"
    private let dataKey = "meditrack_widget_data"

    func placeholder(in context: Context) -> NextDoseEntry {
        NextDoseEntry(
            date: Date(),
            name: "Medication",
            dosage: "500mg",
            time: "8:00 AM",
            icon: "pill",
            isEmpty: false
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (NextDoseEntry) -> Void) {
        let entry = loadEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NextDoseEntry>) -> Void) {
        let entry = loadEntry()
        // No automatic refresh — the app pushes updates via WidgetCenter.shared.reloadAllTimelines()
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }

    private func loadEntry() -> NextDoseEntry {
        guard let defaults = UserDefaults(suiteName: appGroupID),
              let jsonString = defaults.string(forKey: dataKey),
              let jsonData = jsonString.data(using: .utf8),
              let widget = try? JSONDecoder().decode(WidgetDataModel.self, from: jsonData),
              let nextDose = widget.nextDose else {
            return NextDoseEntry(date: Date(), name: nil, dosage: nil, time: nil, icon: nil, isEmpty: true)
        }

        return NextDoseEntry(
            date: Date(),
            name: nextDose.name,
            dosage: nextDose.dosage,
            time: nextDose.time,
            icon: nextDose.icon,
            isEmpty: false
        )
    }
}

private struct NextDoseModel: Decodable {
    let name: String
    let dosage: String
    let form: String
    let time: String
    let icon: String
}

private struct WidgetDataModel: Decodable {
    let nextDose: NextDoseModel?
    let updatedAt: String
}

struct NextDoseWidgetView: View {
    let entry: NextDoseEntry

    var body: some View {
        if entry.isEmpty || entry.name == nil {
            emptyView
        } else {
            doseView
        }
    }

    private var emptyView: some View {
        VStack(spacing: 4) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 28))
                .foregroundColor(.green)
            Text("All done for today!")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.primary)
            Text("MediTrack")
                .font(.system(size: 11))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var doseView: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Next Dose")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.white.opacity(0.9))

            Text(entry.name ?? "")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)

            Text(entry.dosage ?? "")
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.9))
                .lineLimit(1)

            HStack(spacing: 4) {
                Image(systemName: "clock.fill")
                    .font(.system(size: 10))
                Text(entry.time ?? "")
                    .font(.system(size: 12, weight: .semibold))
            }
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.white.opacity(0.2))
            .cornerRadius(8)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(16)
        .background(
            LinearGradient(
                colors: [Color(hex: "1FA2A6"), Color(hex: "2563EB")],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        r = Double((int >> 16) & 0xFF) / 255.0
        g = Double((int >> 8) & 0xFF) / 255.0
        b = Double(int & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}

@main
struct NextDoseWidget: Widget {
    let kind: String = "NextDoseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NextDoseProvider()) { entry in
            NextDoseWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    Color.clear
                }
        }
        .configurationDisplayName("Next Dose")
        .description("Shows your next upcoming medication dose.")
        .supportedFamilies([.systemSmall])
    }
}
