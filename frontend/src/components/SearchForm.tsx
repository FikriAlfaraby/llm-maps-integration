// frontend/src/components/SearchForm.tsx
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { QueryRequest } from '../types';

interface SearchFormProps {
  onSearch: (request: QueryRequest) => void;
  loading?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, loading, userLocation }) => {
  const [prompt, setPrompt] = useState('');
  const [useCache, setUseCache] = useState(true);
  const [maxResults, setMaxResults] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const request: QueryRequest = {
      prompt,
      use_cache: useCache,
      max_results: maxResults,
    };

    if (userLocation) {
      request.user_location = userLocation;
    }

    onSearch(request);
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Find Places with AI
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          label="What are you looking for?"
          placeholder="e.g., Cari tempat makan ramen enak di Bandung dekat stasiun..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={useCache}
                onChange={(e) => setUseCache(e.target.checked)}
                disabled={loading}
              />
            }
            label="Use cached results (faster)"
          />
          
          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
            disabled={loading || !prompt.trim()}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default SearchForm;