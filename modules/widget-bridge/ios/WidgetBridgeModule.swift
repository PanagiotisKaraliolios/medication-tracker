import ExpoModulesCore
import WidgetKit

public final class WidgetBridgeModule: Module {
    private let appGroupId = "group.com.anonymous.medicationtracker"

    public func definition() -> ModuleDefinition {
        Name("WidgetBridge")

        AsyncFunction("reloadAllTimelines") { () -> Bool in
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
                return true
            }
            return false
        }

        AsyncFunction("setItem") { (key: String, value: String) -> Bool in
            guard let defaults = UserDefaults(suiteName: self.appGroupId) else {
                return false
            }
            defaults.set(value, forKey: key)
            return true
        }

        AsyncFunction("getItem") { (key: String) -> String? in
            let defaults = UserDefaults(suiteName: self.appGroupId)
            return defaults?.string(forKey: key)
        }
    }
}
