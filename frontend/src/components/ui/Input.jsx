import React from 'react';

const Input = ({ icon: Icon, ...props }) => {
  return (
    <div className="relative group mb-3">
      {/* Icon sizing and positioning adjusted for the slimmer input */}
      {Icon && (
        <Icon 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#2BB8B8] w-[18px] h-[18px] transition-colors z-10" 
        />
      )}
      
      <input 
        {...props}
        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm placeholder:text-white/30 focus:border-[#2BB8B8]/40 focus:bg-white/[0.08] outline-none transition-all duration-300 relative z-0" 
      />
      
      {/* Subtle bottom highlight on focus */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-[#2BB8B8] transition-all duration-500 group-focus-within:w-[80%] opacity-50"></div>
    </div>
  );
};

export default Input;