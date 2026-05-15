import React, { useState, useEffect, useContext } from 'react';
import { LocationContext } from './LocationContextInstance.jsx';
import { ToastContext } from '../components/ui/ToastContextInstance.jsx';

export const LocationProvider = ({ children }) => {
  const [coords, setCoords] = useState({ lat: 8.9806, lng: 38.7578 });
  const [permission, setPermission] = useState('unknown');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useContext(ToastContext);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPermission('denied');
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPermission('granted');
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError(null);
        setLoading(false);
      },
      (err) => {
        setPermission('denied');
        setError(err.message || 'Location access denied');
        setLoading(false);
        
        // Use a silent fallback to Addis Ababa so the app stays functional
        setCoords({ lat: 8.9806, lng: 38.7578 });
        
        if (err.code === err.PERMISSION_DENIED) {
          toast?.show?.('Location access denied. Using default location.', 'warning');
        }
      },
      { 
        enableHighAccuracy: false, // Switching to false can be more reliable in some browsers
        maximumAge: 60000, 
        timeout: 15000 
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [toast]);

  return (
    <LocationContext.Provider value={{ coords, permission, error, loading }}>
      {children}
    </LocationContext.Provider>
  );
};