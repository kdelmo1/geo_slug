import React from 'react';

interface ProfilePictureProps {
  size?: 'small' | 'medium' | 'large';
  alt?: string;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({ 
  size = 'medium',
  alt = 'Profile Picture'
}) => {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48'
  };

  return (
    <div className={`rounded-full overflow-hidden border-4 border-gray-300 ${sizeClasses[size]}`}>
      <img
        src="vite.svg"
        alt={alt}
        className="w-full h-full object-cover"
        style={{ borderRadius: "50%", border: "4px solid #ccc", width: size === 'small' ? 64 : size === 'large' ? 192 : 128, height: size === 'small' ? 64 : size === 'large' ? 192 : 128 }}
      />
    </div>
  );
};

export default ProfilePicture;