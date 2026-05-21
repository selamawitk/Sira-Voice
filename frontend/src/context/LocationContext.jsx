import React, { useState, useEffect, useContext } from 'react';
import { LocationContext } from './LocationContextInstance.jsx';
import { AuthContext } from './AuthContextInstance.jsx';
import { ToastContext } from '../components/ui/ToastContextInstance.jsx';
import api from '../services/api.js';

export const LocationProvider = ({ children }) => {
  const isSupported = typeof window !== 'undefined' && !!navigator.geolocation;

  const [coords, setCoords] = useState({ lat: 8.9806, lng: 38.7578 });
  const [permission, setPermission] = useState(isSupported ? 'unknown' : 'denied');
  const [loading, setLoading] = useState(isSupported);
  const [error, setError] = useState(isSupported ? null : 'Geolocation not supported');
  const [hasSyncedLocation, setHasSyncedLocation] = useState(false);
  
  const toast = useContext(ToastContext);
  const auth = useContext(AuthContext);

  useEffect(() => {
    if (!isSupported) return;

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
        setCoords({ lat: 8.9806, lng: 38.7578 });
        
        if (err.code === err.PERMISSION_DENIED) {
          toast?.show?.('Location access denied. Using default location.', 'warning');
        }
      },
      { 
        enableHighAccuracy: false, 
        maximumAge: 60000, 
        timeout: 15000 
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSupported, toast]);

  useEffect(() => {
    const syncLocation = async () => {
      if (!auth?.user || hasSyncedLocation) return;
      
      try {
        await api.put('/users/location', {
          longitude: coords.lng,
          latitude: coords.lat,
          formattedAddress: `${coords.lat}, ${coords.lng}`
        });
        setHasSyncedLocation(true);
      } catch (err) {
        console.warn('Unable to sync worker location to server:', err?.message || err);
      }
    };

    if (permission === 'granted' && auth?.user) {
      syncLocation();
    }
  }, [auth?.user, coords.lat, coords.lng, permission, hasSyncedLocation]);

  return (
    <LocationContext.Provider value={{ coords, permission, error, loading }}>
      {children}
    </LocationContext.Provider>
  );
};