import React, { useState, useEffect, useContext } from 'react';
import { LocationContext } from './LocationContextInstance.jsx';
import { ToastContext } from '../components/ui/ToastProvider.jsx';

export const LocationProvider = ({ children }) => {
  const [coords, setCoords] = useState({ lat: 8.9806, lng: 38.7578 }); // Default: Addis Ababa
  const [permission, setPermission] = useState('unknown'); // unknown | granted | denied
  const [error, setError] = useState(null);
  const toast = useContext(ToastContext);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setPermission('granted');
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setError(null);
        },
        (err) => {
          setPermission('denied');
          setError(err.message || 'Location access denied');
          toast?.show?.('Location access denied. Using default location.', 'warning');
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [toast]);

  return (
    <LocationContext.Provider value={{ coords, permission, error }}>
      {children}
    </LocationContext.Provider>
  );
};