import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Sidebar } from "./components/Sidebar.js";
import { Header } from "./components/Header.js";
import { CommandPalette } from "./components/CommandPalette.js";
import { ToastContainer, ToastMessage } from "./components/Toast.js";
import { DashboardOverview } from "./views/DashboardOverview.js";
import { LRManagementView } from "./views/LRManagementView.js";
import { ShipmentsView } from "./views/ShipmentsView.js";
import { GeofencingView } from "./views/GeofencingView.js";
import { LiveTrackingView } from "./views/LiveTrackingView.js";
import { VehicleManagementView } from "./views/VehicleManagementView.js";
import { DriverManagementView } from "./views/DriverManagementView.js";
import { SupplierManagementView } from "./views/SupplierManagementView.js";
import { LoginView } from "./views/LoginView.js";
import { DriverPortalView } from "./views/DriverPortalView.js";
import {
  NavigationTab,
  Vehicle,
  Shipment,
  GeofenceZone,
  Driver,
  Supplier,
  LiveAlert,
  ShipmentStatus,
  AuthUser,
} from "./types.js";
import { api } from "./services/api.js";
import { Loader2, Truck } from "lucide-react";

// Centered Loading Overlay for Sign In and Sign Out transitions
const AuthTransitionOverlay: React.FC<{
  title: string;
  subtitle: string;
}> = ({ title, subtitle }) => {
  return (
    <div className="fixed inset-0 z-[999999] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-7 max-w-sm w-full text-center flex flex-col items-center gap-4 animate-fadeIn">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full border-3 border-indigo-100 border-t-indigo-600 animate-spin"></div>
          <Truck className="w-6 h-6 text-indigo-600 absolute" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>("dashboard");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Live Real MongoDB Atlas States
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [geofences, setGeofences] = useState<GeofenceZone[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);

  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightVehicleNumber, setHighlightVehicleNumber] = useState<string | undefined>(undefined);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem("fleetdash_auth");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return null;
  });

  // Centered Loading Spinner state for Login & Logout transitions
  const [authTransition, setAuthTransition] = useState<{
    isLoading: boolean;
    title: string;
    subtitle: string;
  }>({
    isLoading: false,
    title: "",
    subtitle: "",
  });

  const handleLoginOffice = () => {
    // Immediately sync freshest live data from MongoDB
    fetchMongoData(true);

    setAuthTransition({
      isLoading: true,
      title: "Authenticating Fleet Operations Lead...",
      subtitle: "Connecting to FleetDash Operations Dashboard",
    });

    setTimeout(() => {
      const user: AuthUser = {
        role: "OFFICE_MANAGER",
        email: "fleetdash@test.com",
        name: "Operations Lead",
      };
      setCurrentUser(user);
      try {
        localStorage.setItem("fleetdash_auth", JSON.stringify(user));
      } catch (e) {}
      setAuthTransition({ isLoading: false, title: "", subtitle: "" });
      addToast("success", "Authenticated as Fleet Manager", "Connected to FleetDash Operations Dashboard");
    }, 850);
  };

  const handleLoginDriver = (drv: Driver) => {
    setAuthTransition({
      isLoading: true,
      title: `Connecting Driver ${drv.name}...`,
      subtitle: `Preparing Driver Mobile Cockpit • Truck: ${drv.assignedVehicleNumber || "Fleet Standby"}`,
    });

    setTimeout(() => {
      const user: AuthUser = {
        role: "DRIVER",
        driver: drv,
        name: drv.name,
        email: drv.phone,
      };
      setCurrentUser(user);
      try {
        localStorage.setItem("fleetdash_auth", JSON.stringify(user));
      } catch (e) {}
      setAuthTransition({ isLoading: false, title: "", subtitle: "" });
      addToast("success", `Welcome Driver ${drv.name}!`, `Assigned Vehicle: ${drv.assignedVehicleNumber || "Standby"}`);
    }, 850);
  };

  const handleLogout = () => {
    setAuthTransition({
      isLoading: true,
      title: "Signing Out of Session...",
      subtitle: "Securing connection & clearing local credentials",
    });

    setTimeout(() => {
      setCurrentUser(null);
      try {
        localStorage.removeItem("fleetdash_auth");
      } catch (e) {}
      setAuthTransition({ isLoading: false, title: "", subtitle: "" });
      addToast("info", "Signed Out", "Returned to Dual-Mode Login Screen");
    }, 750);
  };

  // Helper for adding modern toast notifications
  const addToast = useCallback(
    (type: "success" | "warning" | "info" | "error", title: string, message?: string) => {
      const id = "toast-" + Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load all live collections from MongoDB on startup or real-time sync
  const fetchMongoData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [v, s, g, d, sup, a] = await Promise.all([
        api.getVehicles(),
        api.getShipments(),
        api.getGeofences(),
        api.getDrivers(),
        api.getSuppliers(),
        api.getAlerts(),
      ]);
      setVehicles(v);
      setShipments(s);
      setGeofences(g);
      setDrivers(d);
      setSuppliers(sup);
      setAlerts(a);
    } catch (err: any) {
      if (!silent) {
        console.error("Failed to load data from MongoDB Atlas:", err);
        addToast("error", "Database Sync Error", err?.message || "Could not retrieve records from MongoDB.");
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchMongoData();
  }, [fetchMongoData]);

  // Real-Time Live Sync: Poll every 5s & on tab focus so new driver registrations & status updates reflect instantaneously without reloading!
  useEffect(() => {
    const handleFocus = () => {
      fetchMongoData(true);
    };

    window.addEventListener("focus", handleFocus);

    const interval = setInterval(async () => {
      try {
        const liveDrivers = await api.getDrivers();
        setDrivers((prev) => {
          // Detect any newly registered applicant waiting for approval
          const newPending = liveDrivers.filter(
            (ld) =>
              ld.approvalStatus === "PENDING_APPROVAL" &&
              !prev.some((pd) => (pd.id === ld.id || (pd as any)._id === (ld as any)._id) && pd.approvalStatus === "PENDING_APPROVAL")
          );

          if (newPending.length > 0 && currentUser?.role === "OFFICE_MANAGER") {
            newPending.forEach((np) => {
              addToast(
                "info",
                "New Driver Registration Waiting!",
                `${np.name} applied for fleet access. Review in Notifications or Driver Directory.`
              );
            });
          }

          // Return fresh drivers if count or statuses changed
          const hasChanges =
            liveDrivers.length !== prev.length ||
            liveDrivers.some(
              (ld, idx) =>
                prev[idx]?.approvalStatus !== ld.approvalStatus ||
                prev[idx]?.status !== ld.status
            );

          return hasChanges ? liveDrivers : prev;
        });
      } catch (e) {
        // Silent catch for live polling
      }
    }, 4000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [currentUser, fetchMongoData, addToast]);

  // Global Ctrl + K / Cmd + K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Real MongoDB CRUD Handlers with instant persistence & toast feedback
  const handleAddShipment = async (newShipment: Shipment) => {
    try {
      const { id: _, ...payload } = newShipment;
      const saved = await api.createShipment(payload);
      setShipments((prev) => [saved, ...prev]);

      // Sync assigned vehicle status to IN_TRANSIT in MongoDB
      const matchedVeh = vehicles.find((v) => v.vehicleNumber === saved.vehicleNumber);
      if (matchedVeh) {
        const updatedVeh = await api.updateVehicle(matchedVeh.id, { status: "IN_TRANSIT" });
        setVehicles((prev) => prev.map((v) => (v.id === matchedVeh.id ? updatedVeh : v)));
      }

      // Sync assigned driver status to ON_DUTY in MongoDB
      const matchedDrv = drivers.find(
        (d) =>
          d.assignedVehicleNumber === saved.vehicleNumber ||
          d.name.toLowerCase() === saved.driverName.toLowerCase()
      );
      if (matchedDrv) {
        const updatedDrv = await api.updateDriver(matchedDrv.id, { status: "ON_DUTY" });
        setDrivers((prev) => prev.map((d) => (d.id === matchedDrv.id ? updatedDrv : d)));
      }

      addToast(
        "success",
        `LR Saved to MongoDB: ${saved.lrNumber}`,
        `Assigned to ${saved.vehicleNumber} (${saved.clientName})`
      );
    } catch (err: any) {
      addToast("error", "Failed to Save LR", err?.message || "Database error");
    }
  };

  const handleUpdateShipmentStatus = async (id: string, newStatus: ShipmentStatus) => {
    try {
      const updated = await api.updateShipmentStatus(id, newStatus);
      setShipments((prev) => prev.map((s) => (s.id === id ? updated : s)));

      // Sync vehicle and driver when shipment is completed or dispatched
      const matchedVeh = vehicles.find((v) => v.vehicleNumber === updated.vehicleNumber);
      if (matchedVeh) {
        const targetVehicleStatus =
          newStatus === "DELIVERED" || newStatus === "CANCELLED"
            ? "AVAILABLE"
            : newStatus === "IN_TRANSIT"
            ? "IN_TRANSIT"
            : matchedVeh.status;

        const updatePayload: Partial<Vehicle> = { status: targetVehicleStatus };
        if (targetVehicleStatus === "AVAILABLE" && matchedVeh.currentLocation) {
          updatePayload.currentLocation = {
            ...matchedVeh.currentLocation,
            speedKmph: 0,
          };
        }

        const updatedVeh = await api.updateVehicle(matchedVeh.id, updatePayload);
        setVehicles((prev) => prev.map((v) => (v.id === matchedVeh.id ? updatedVeh : v)));
      }

      const matchedDrv = drivers.find(
        (d) =>
          d.assignedVehicleNumber === updated.vehicleNumber ||
          d.name.toLowerCase() === updated.driverName.toLowerCase()
      );
      if (matchedDrv) {
        const targetDriverStatus =
          newStatus === "DELIVERED" || newStatus === "CANCELLED"
            ? "AVAILABLE"
            : "ON_DUTY";

        const updatedDrv = await api.updateDriver(matchedDrv.id, { status: targetDriverStatus });
        setDrivers((prev) => prev.map((d) => (d.id === matchedDrv.id ? updatedDrv : d)));
      }

      addToast("info", "Status Updated in MongoDB", `Status marked as ${newStatus.replace("_", " ")}`);
    } catch (err: any) {
      addToast("error", "Update Failed", err?.message || "Database error");
    }
  };

  const handleAddVehicle = async (newVehicle: Vehicle) => {
    try {
      const { id: _, ...payload } = newVehicle;
      const saved = await api.createVehicle(payload);
      setVehicles((prev) => [saved, ...prev]);

      // Sync driver if assigned
      const matchedDrv = drivers.find(
        (d) =>
          d.name.toLowerCase() === saved.driverName.toLowerCase() ||
          d.phone === saved.driverContact
      );
      if (matchedDrv) {
        const updatedDrv = await api.updateDriver(matchedDrv.id, {
          assignedVehicleNumber: saved.vehicleNumber,
        });
        setDrivers((prev) => prev.map((d) => (d.id === matchedDrv.id ? updatedDrv : d)));
      }

      addToast(
        "success",
        `Vehicle Added to MongoDB: ${saved.vehicleNumber}`,
        `${saved.size} • Driver: ${saved.driverName}`
      );
    } catch (err: any) {
      addToast("error", "Failed to Add Vehicle", err?.message || "Database error");
    }
  };

  const handleUpdateVehicle = async (id: string, update: Partial<Vehicle>) => {
    try {
      const oldVeh = vehicles.find((v) => v.id === id || (v as any)._id === id);
      const updatedVeh = await api.updateVehicle(id, update);
      setVehicles((prev) => prev.map((v) => (v.id === id || (v as any)._id === id ? updatedVeh : v)));

      // Driver synchronization
      const oldDriverName = oldVeh?.driverName;
      const newDriverName = updatedVeh.driverName;

      if (oldVeh && oldDriverName && oldDriverName !== "Unassigned" && oldDriverName !== newDriverName) {
        // Find previous driver and clear their vehicle assignment
        const previousDriver = drivers.find((d) => d.name.toLowerCase() === oldDriverName.toLowerCase());
        if (previousDriver && previousDriver.assignedVehicleNumber === oldVeh.vehicleNumber) {
          const cleared = await api.updateDriver(previousDriver.id, { assignedVehicleNumber: "" });
          setDrivers((prev) => prev.map((d) => (d.id === previousDriver.id ? cleared : d)));
        }
      }

      if (newDriverName && newDriverName !== "Unassigned" && newDriverName !== oldDriverName) {
        // Find new driver and assign this vehicle
        const newDriver = drivers.find(
          (d) => d.name.toLowerCase() === newDriverName.toLowerCase() || d.phone === updatedVeh.driverContact
        );
        if (newDriver) {
          const assigned = await api.updateDriver(newDriver.id, { assignedVehicleNumber: updatedVeh.vehicleNumber });
          setDrivers((prev) => prev.map((d) => (d.id === newDriver.id ? assigned : d)));
        }
      }

      addToast(
        "success",
        `Vehicle Updated: ${updatedVeh.vehicleNumber}`,
        `Driver: ${updatedVeh.driverName} • Status: ${updatedVeh.status}`
      );
    } catch (err: any) {
      addToast("error", "Failed to Update Vehicle", err?.message || "Database error");
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      const v = vehicles.find((veh) => veh.id === id || (veh as any)._id === id);
      await api.deleteVehicle(id);
      setVehicles((prev) => prev.filter((veh) => veh.id !== id && (veh as any)._id !== id));

      // If a driver was assigned, clear their assignment in MongoDB
      if (v?.vehicleNumber) {
        const assignedDrv = drivers.find((d) => d.assignedVehicleNumber === v.vehicleNumber);
        if (assignedDrv) {
          const cleared = await api.updateDriver(assignedDrv.id, { assignedVehicleNumber: "" });
          setDrivers((prev) => prev.map((d) => (d.id === assignedDrv.id ? cleared : d)));
        }
      }

      addToast("warning", "Vehicle Deleted from MongoDB", v ? `${v.vehicleNumber} removed` : undefined);
    } catch (err: any) {
      addToast("error", "Delete Failed", err?.message || "Database error");
    }
  };

  const handleAddDriver = async (newDriver: Driver) => {
    try {
      const { id: _, ...payload } = newDriver;
      const saved = await api.createDriver(payload);
      setDrivers((prev) => [saved, ...prev]);

      // Sync vehicle if assigned
      if (saved.assignedVehicleNumber) {
        const matchedVeh = vehicles.find((v) => v.vehicleNumber === saved.assignedVehicleNumber);
        if (matchedVeh) {
          const updatedVeh = await api.updateVehicle(matchedVeh.id, {
            driverName: saved.name,
            driverContact: saved.phone,
          });
          setVehicles((prev) => prev.map((v) => (v.id === matchedVeh.id ? updatedVeh : v)));
        }
      }

      addToast("success", `Driver Saved to MongoDB: ${saved.name}`, `Phone: ${saved.phone}`);
    } catch (err: any) {
      addToast("error", "Failed to Add Driver", err?.message || "Database error");
    }
  };

  const handleUpdateDriver = async (id: string, update: Partial<Driver>) => {
    try {
      const oldDriver = drivers.find((d) => d.id === id || (d as any)._id === id);
      const updatedDriver = await api.updateDriver(id, update);
      setDrivers((prev) => prev.map((d) => (d.id === id || (d as any)._id === id ? updatedDriver : d)));

      const oldPlate = oldDriver?.assignedVehicleNumber;
      const newPlate = updatedDriver.assignedVehicleNumber;

      // If truck changed or was unassigned, clear the old truck
      if (oldPlate && oldPlate !== newPlate) {
        const oldVeh = vehicles.find((v) => v.vehicleNumber === oldPlate);
        if (oldVeh) {
          const clearedVeh = await api.updateVehicle(oldVeh.id, {
            driverName: "Unassigned",
            driverContact: "N/A",
          });
          setVehicles((prev) => prev.map((v) => (v.id === oldVeh.id ? clearedVeh : v)));
        }
      }

      // If new truck assigned, update the new truck
      if (newPlate && newPlate !== oldPlate) {
        const newVeh = vehicles.find((v) => v.vehicleNumber === newPlate);
        if (newVeh) {
          const assignedVeh = await api.updateVehicle(newVeh.id, {
            driverName: updatedDriver.name,
            driverContact: updatedDriver.phone,
          });
          setVehicles((prev) => prev.map((v) => (v.id === newVeh.id ? assignedVeh : v)));
        }
      }

      // If current logged in driver is being updated, sync session
      if (currentUser?.driver && (currentUser.driver.id === id || (currentUser.driver as any)._id === id)) {
        const nextUser: AuthUser = { ...currentUser, driver: updatedDriver };
        setCurrentUser(nextUser);
        try {
          localStorage.setItem("fleetdash_auth", JSON.stringify(nextUser));
        } catch (e) {}
      }

      addToast(
        "success",
        `Driver Profile Updated: ${updatedDriver.name}`,
        `Truck: ${updatedDriver.assignedVehicleNumber || "Unassigned"}`
      );
    } catch (err: any) {
      addToast("error", "Failed to Update Driver", err?.message || "Database error");
    }
  };

  const handleDeleteDriver = async (id: string) => {
    try {
      const d = drivers.find((drv) => drv.id === id || (drv as any)._id === id);
      await api.deleteDriver(id);
      setDrivers((prev) => prev.filter((d) => d.id !== id && (d as any)._id !== id));

      // If this driver had a vehicle, unassign the vehicle
      if (d?.assignedVehicleNumber) {
        const assignedVeh = vehicles.find((v) => v.vehicleNumber === d.assignedVehicleNumber);
        if (assignedVeh) {
          const clearedVeh = await api.updateVehicle(assignedVeh.id, {
            driverName: "Unassigned",
            driverContact: "N/A",
          });
          setVehicles((prev) => prev.map((v) => (v.id === assignedVeh.id ? clearedVeh : v)));
        }
      }

      addToast("warning", "Driver Deleted from MongoDB", "Driver record permanently removed");
    } catch (err: any) {
      addToast("error", "Delete Failed", err?.message || "Database error");
    }
  };

  const handleApproveDriver = async (id: string) => {
    try {
      const approved = await api.approveDriver(id);
      setDrivers((prev) => prev.map((d) => (d.id === id ? approved : d)));
      addToast(
        "success",
        `Driver Approved: ${approved.name}`,
        `Driver ID ${approved.driverId || approved.phone} can now log into Driver Portal`
      );
    } catch (err: any) {
      addToast("error", "Failed to Approve Driver", err?.message || "Database error");
    }
  };

  const handleRejectDriver = async (id: string) => {
    try {
      const rejected = await api.rejectDriver(id);
      setDrivers((prev) => prev.map((d) => (d.id === id ? rejected : d)));
      addToast(
        "warning",
        `Driver Application Declined: ${rejected.name}`,
        "Registration request marked as rejected"
      );
    } catch (err: any) {
      addToast("error", "Failed to Reject Driver", err?.message || "Database error");
    }
  };

  const handleAddSupplier = async (newSupplier: Supplier) => {
    try {
      const { id: _, ...payload } = newSupplier;
      const saved = await api.createSupplier(payload);
      setSuppliers((prev) => [saved, ...prev]);
      addToast("success", `Supplier Saved to MongoDB: ${saved.name}`, `Code: ${saved.vendorCode}`);
    } catch (err: any) {
      addToast("error", "Failed to Add Supplier", err?.message || "Database error");
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await api.deleteSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      addToast("warning", "Supplier Deleted from MongoDB", "Transporter removed from database");
    } catch (err: any) {
      addToast("error", "Delete Failed", err?.message || "Database error");
    }
  };

  const handleAddGeofence = async (newZone: GeofenceZone) => {
    try {
      const { id: _, ...payload } = newZone;
      const saved = await api.createGeofence(payload);
      setGeofences((prev) => [...prev, saved]);
      addToast("success", `Geofence Saved to MongoDB: ${saved.name}`, `Radius: ${saved.radiusMeters}m`);
    } catch (err: any) {
      addToast("error", "Failed to Save Geofence", err?.message || "Database error");
    }
  };

  const handleToggleGeofence = async (id: string) => {
    try {
      const updated = await api.toggleGeofence(id);
      setGeofences((prev) =>
        prev.map((g) => (g.id === id ? updated : g))
      );
      addToast("info", "Geofence Status Updated in MongoDB", `${updated.name} is now ${updated.isActive ? "Active" : "Inactive"}`);
    } catch (err: any) {
      addToast("error", "Toggle Failed", err?.message || "Database error");
    }
  };

  const handleDeleteGeofence = async (id: string) => {
    try {
      await api.deleteGeofence(id);
      setGeofences((prev) => prev.filter((g) => g.id !== id));
      addToast("warning", "Geofence Deleted from MongoDB", "Zone boundary removed");
    } catch (err: any) {
      addToast("error", "Delete Failed", err?.message || "Database error");
    }
  };

  const handleJumpToTracking = (vehicleNumber: string) => {
    setHighlightVehicleNumber(vehicleNumber);
    setActiveTab("live_tracking");
    addToast("info", `Tracking ${vehicleNumber}`, "Zoomed to live coordinates on map");
  };

  const handleVehicleUpdated = (updatedVehicle: Vehicle) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v))
    );
  };

  const handleDismissAlert = async (id: string) => {
    try {
      const alertToDismiss = alerts.find((a) => a.id === id);
      await api.dismissAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      addToast(
        "success",
        "Alert Marked as Resolved",
        alertToDismiss ? `${alertToDismiss.title} resolved & removed from MongoDB Atlas` : "Alert cleared from database"
      );
    } catch (err: any) {
      addToast("error", "Failed to Dismiss Alert", err?.message || "Could not update alert");
    }
  };

  const handleSelectAlert = (alt: LiveAlert, action?: "lr" | "vehicle" | "geofence") => {
    const lrMatch = alt.message.match(/LR-\d{4}-\d{4}/);
    const lrNum = lrMatch ? lrMatch[0] : null;

    if (action === "lr" || (!action && lrNum && alt.type === "EWAY_EXPIRY")) {
      if (lrNum) {
        const found = shipments.find((s) => s.lrNumber === lrNum);
        if (found) {
          setSelectedShipment(found);
          const isPast = found.status === "DELIVERED" || found.status === "CANCELLED";
          setActiveTab(isPast ? "past_shipments" : "active_shipments");
          addToast("info", `Opened Consignment ${found.lrNumber}`, `Client: ${found.clientName} • Status: ${found.status}`);
          return;
        }
      }
      setActiveTab("active_shipments");
      addToast("info", "Navigated to Active Shipments", "Reviewing consignment records");
      return;
    }

    if (action === "geofence" || (!action && alt.type === "GEOFENCE_BREACH")) {
      setActiveTab("geofencing");
      addToast("info", "Geofencing Surveillance", alt.title);
      return;
    }

    if (action === "vehicle" || (!action && alt.vehicleNumber)) {
      if (alt.vehicleNumber) {
        handleJumpToTracking(alt.vehicleNumber);
        return;
      }
    }

    setActiveTab("live_tracking");
  };

  const pendingDrivers = useMemo(() => {
    return drivers.filter((d) => d.approvalStatus === "PENDING_APPROVAL");
  }, [drivers]);

  if (!currentUser) {
    return (
      <>
        {authTransition.isLoading && (
          <AuthTransitionOverlay
            title={authTransition.title}
            subtitle={authTransition.subtitle}
          />
        )}
        <LoginView
          onLoginOffice={handleLoginOffice}
          onLoginDriver={handleLoginDriver}
          drivers={drivers}
          onDriverRegistered={(newDriver) => {
            setDrivers((prev) => [newDriver, ...prev]);
            addToast("info", "New Driver Application Submitted", `${newDriver.name} is awaiting approval in Driver Directory.`);
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  if (currentUser.role === "DRIVER" && currentUser.driver) {
    return (
      <>
        {authTransition.isLoading && (
          <AuthTransitionOverlay
            title={authTransition.title}
            subtitle={authTransition.subtitle}
          />
        )}
        <DriverPortalView
          driver={currentUser.driver}
          shipments={shipments}
          vehicles={vehicles}
          onUpdateShipmentStatus={handleUpdateShipmentStatus}
          onVehicleUpdated={handleVehicleUpdated}
          onLogout={handleLogout}
          onAddToast={addToast}
          onUpdateDriver={handleUpdateDriver}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 antialiased font-sans relative">
      {authTransition.isLoading && (
        <AuthTransitionOverlay
          title={authTransition.title}
          subtitle={authTransition.subtitle}
        />
      )}
      {/* 1. Sidebar (Left, Clean Mode) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeShipmentsCount={shipments.filter((s) => s.status === "IN_TRANSIT" || s.status === "LOADING").length}
        criticalAlertCount={alerts.filter((a) => a.severity === "critical").length}
        pendingDriverCount={pendingDrivers.length}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header with Command Palette trigger */}
        <Header
          activeTab={activeTab}
          alerts={alerts}
          pendingDrivers={pendingDrivers}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSelectAlert={handleSelectAlert}
          onDismissAlert={handleDismissAlert}
          onApproveDriver={handleApproveDriver}
          onRejectDriver={handleRejectDriver}
          onDeleteDriver={handleDeleteDriver}
          onNavigateToDrivers={() => {
            setActiveTab("drivers");
            addToast(
              "info",
              "Navigated to Driver Directory",
              "Review applicant commercial credentials and approve access"
            );
          }}
          onToggleSidebar={() => setIsCollapsed((prev) => !prev)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* 2. Main Page Views & Sections (Tabs/Routes) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex flex-col items-center justify-center z-50">
              <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-xl px-5 py-3 rounded-2xl">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                <span className="text-sm font-semibold text-slate-800">
                  Connecting & Syncing Fleet Data...
                </span>
              </div>
            </div>
          )}

          <div className="max-w-[1600px] mx-auto">
            {activeTab === "dashboard" && (
              <DashboardOverview
                vehicles={vehicles}
                shipments={shipments}
                drivers={drivers}
                setActiveTab={setActiveTab}
                onSelectShipment={(s) => {
                  setSelectedShipment(s);
                  setActiveTab("active_shipments");
                }}
              />
            )}

            {activeTab === "lr_management" && (
              <LRManagementView
                vehicles={vehicles}
                onAddShipment={handleAddShipment}
                shipments={shipments}
                suppliers={suppliers}
              />
            )}

            {activeTab === "active_shipments" && (
              <ShipmentsView
                shipments={shipments}
                isPastShipments={false}
                selectedShipment={selectedShipment}
                setSelectedShipment={setSelectedShipment}
                onUpdateShipmentStatus={handleUpdateShipmentStatus}
                onJumpToTracking={handleJumpToTracking}
              />
            )}

            {activeTab === "past_shipments" && (
              <ShipmentsView
                shipments={shipments}
                isPastShipments={true}
                selectedShipment={selectedShipment}
                setSelectedShipment={setSelectedShipment}
                onUpdateShipmentStatus={handleUpdateShipmentStatus}
                onJumpToTracking={handleJumpToTracking}
              />
            )}

            {activeTab === "geofencing" && (
              <GeofencingView
                geofences={geofences}
                onAddGeofence={handleAddGeofence}
                onToggleZone={handleToggleGeofence}
                onDeleteZone={handleDeleteGeofence}
                vehicles={vehicles}
              />
            )}

            {activeTab === "live_tracking" && (
              <LiveTrackingView
                vehicles={vehicles}
                shipments={shipments}
                highlightVehicleNumber={highlightVehicleNumber}
              />
            )}

            {activeTab === "vehicles" && (
              <VehicleManagementView
                vehicles={vehicles}
                drivers={drivers}
                suppliers={suppliers}
                onAddVehicle={handleAddVehicle}
                onUpdateVehicle={handleUpdateVehicle}
                onDeleteVehicle={handleDeleteVehicle}
                onViewOnMap={handleJumpToTracking}
              />
            )}

            {activeTab === "drivers" && (
              <DriverManagementView
                drivers={drivers}
                onAddDriver={handleAddDriver}
                onUpdateDriver={handleUpdateDriver}
                onDeleteDriver={handleDeleteDriver}
                onApproveDriver={handleApproveDriver}
                onRejectDriver={handleRejectDriver}
                vehicles={vehicles}
              />
            )}

            {activeTab === "suppliers" && (
              <SupplierManagementView
                suppliers={suppliers}
                onAddSupplier={handleAddSupplier}
                onDeleteSupplier={handleDeleteSupplier}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modern Spotlight Command Palette (Ctrl + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        vehicles={vehicles}
        shipments={shipments}
        setActiveTab={setActiveTab}
        onSelectVehicle={handleJumpToTracking}
        onSelectShipment={(s) => {
          setSelectedShipment(s);
          setActiveTab("active_shipments");
        }}
      />

      {/* Floating Modern Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
