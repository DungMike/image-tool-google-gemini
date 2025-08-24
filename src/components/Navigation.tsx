
import { NavLink } from 'react-router-dom';
import { SparklesIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';

export function Navigation() {
  const navItems = [
    {
      name: 'Image Generation',
      href: '/',
      icon: SparklesIcon,
      description: 'Generate images from prompts',
    },
    {
      name: 'Voice Generation',
      href: '/voice',
      icon: SpeakerWaveIcon,
      description: 'Generate voices from texts',
    },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo/Brand */}
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  AI Generator
                </span>
              </div>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                }`
              }
            >
              <div className="flex items-center">
                <item.icon className="w-5 h-5 mr-3" />
                <div>
                  <div>{item.name}</div>
                  <div className="text-sm text-gray-500">{item.description}</div>
                </div>
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

